/**
 * Prediksi level laut menggunakan model ONNX harmonic regression.
 *
 * Cara pakai:
 *   1. Jalankan `python rnd/scripts/export_to_onnx.py` untuk menghasilkan
 *      rnd/models/tidal_model.onnx dan rnd/models/tidal_meta.json
 *   2. Salin kedua file tersebut ke gnss/models/
 *   3. Install: npm install onnxruntime-node
 *
 * Contoh:
 *   const result = await forecastTidal({ horizonHours: 72, lat: -7.8, lon: 110.5 });
 */

import * as ort from "onnxruntime-node";
import * as fs from "fs";
import * as path from "path";

// ── Path file ────────────────────────────────────────────────────────────────

const MODELS_DIR = path.join(process.cwd(), "models");
const ONNX_PATH  = path.join(MODELS_DIR, "tidal_model.onnx");
const META_PATH  = path.join(MODELS_DIR, "tidal_meta.json");

// ── Tipe data ─────────────────────────────────────────────────────────────────

interface TidalMeta {
  t0: string;
  rmse: number;
  base_lat: number;
  base_lon: number;
  wave_speed_deg_per_hour: number;
  constituents: { name: string; period_hours: number }[];
}

export interface ForecastPoint {
  datetime: string;  // ISO 8601
  sea_level_m: number;
}

export interface ForecastResult {
  horizon_hours: number;
  lat: number;
  lon: number;
  amplitude_scale: number;
  rmse: number;
  unit: "meters";
  generated_at: string;
  forecast: ForecastPoint[];
}

export interface ForecastOptions {
  horizonHours?: number;    // default 72
  lat?: number;             // default dari meta (base_lat)
  lon?: number;             // default dari meta (base_lon)
  startTime?: Date;         // default sekarang (dibulatkan ke jam)
}

// ── Singleton session & metadata ─────────────────────────────────────────────

let _session: ort.InferenceSession | null = null;
let _meta: TidalMeta | null = null;

function loadMeta(): TidalMeta {
  if (_meta) return _meta;
  if (!fs.existsSync(META_PATH)) {
    throw new Error(
      `File metadata tidak ditemukan: ${META_PATH}\n` +
      `Jalankan: python rnd/scripts/export_to_onnx.py`
    );
  }
  _meta = JSON.parse(fs.readFileSync(META_PATH, "utf-8")) as TidalMeta;
  return _meta;
}

async function loadSession(): Promise<ort.InferenceSession> {
  if (_session) return _session;
  if (!fs.existsSync(ONNX_PATH)) {
    throw new Error(
      `Model ONNX tidak ditemukan: ${ONNX_PATH}\n` +
      `Jalankan: python rnd/scripts/export_to_onnx.py`
    );
  }
  _session = await ort.InferenceSession.create(ONNX_PATH);
  return _session;
}

// ── Fungsi bantu ──────────────────────────────────────────────────────────────

/**
 * Skala amplitudo berdasarkan posisi stasiun relatif terhadap base.
 * Sama persis dengan amplitude_scale() di serve_forecast.py.
 */
function amplitudeScale(lat: number, lon: number, meta: TidalMeta): number {
  const dlat = lat - meta.base_lat;
  const dlon = lon - meta.base_lon;
  const latFactor = 1.0 - 0.09 * dlat;
  const lonFactor = 1.0 + 0.06 * dlon;
  return Math.max(0.5, Math.min(2.0, latFactor * lonFactor));
}

/**
 * Konversi array Date ke t_hours Float64Array.
 *
 * Proses:
 *   1. Geser waktu dengan phase offset (gelombang pasang bergerak barat→timur)
 *   2. Hitung jam sejak T0
 *
 * Wajib Float64 karena model memiliki koefisien ~1e10 yang memerlukan
 * double precision untuk menghindari catastrophic cancellation.
 */
function datesToHours(
  times: Date[],
  t0Ms: number,
  phaseOffsetHours: number
): Float64Array {
  const shiftMs = phaseOffsetHours * 3_600_000;
  return new Float64Array(
    times.map((t) => (t.getTime() - shiftMs - t0Ms) / 3_600_000)
  );
}

// ── API publik ────────────────────────────────────────────────────────────────

/**
 * Jalankan prediksi level laut menggunakan model ONNX.
 */
export async function forecastTidal(
  options: ForecastOptions = {}
): Promise<ForecastResult> {
  const meta    = loadMeta();
  const session = await loadSession();

  const {
    horizonHours = 72,
    lat = meta.base_lat,
    lon = meta.base_lon,
  } = options;

  // Waktu mulai: sekarang dibulatkan ke jam
  let startTime = options.startTime ?? new Date();
  startTime = new Date(startTime);
  startTime.setMinutes(0, 0, 0);

  // Buat array waktu per jam
  const times: Date[] = Array.from({ length: horizonHours }, (_, i) =>
    new Date(startTime.getTime() + i * 3_600_000)
  );

  // Phase shift: gelombang pasang merambat barat→timur sepanjang pantai Jawa
  const phaseOffsetHours = (lon - meta.base_lon) / meta.wave_speed_deg_per_hour;
  const t0Ms = new Date(meta.t0).getTime();
  const tHours = datesToHours(times, t0Ms, phaseOffsetHours);

  // Jalankan model ONNX
  const inputTensor = new ort.Tensor("float64", tHours, [tHours.length]);
  const output = await session.run({ t_hours: inputTensor });
  const raw = output.sea_level.data as Float64Array;

  // Terapkan skala amplitudo (pertahankan offset MSL)
  const scale = amplitudeScale(lat, lon, meta);
  const msl   = raw.reduce((a, b) => a + b, 0) / raw.length;
  const scaled = Array.from(raw).map((h) => msl + (h - msl) * scale);

  const forecast: ForecastPoint[] = times.map((dt, i) => ({
    datetime:    dt.toISOString().slice(0, 16),
    sea_level_m: Math.round(scaled[i] * 10_000) / 10_000,
  }));

  return {
    horizon_hours:    horizonHours,
    lat,
    lon,
    amplitude_scale:  Math.round(scale * 10_000) / 10_000,
    rmse:             Math.round(meta.rmse * scale * 10_000) / 10_000,
    unit:             "meters",
    generated_at:     startTime.toISOString().slice(0, 16),
    forecast,
  };
}

/**
 * Prediksi untuk satu titik waktu tertentu.
 */
export async function predictAtTime(
  time: Date,
  lat?: number,
  lon?: number
): Promise<number> {
  const result = await forecastTidal({
    horizonHours: 1,
    lat,
    lon,
    startTime: time,
  });
  return result.forecast[0].sea_level_m;
}
