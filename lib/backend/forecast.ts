export type TidalForecast = {
  next: number;
  max6h: number;
  min6h: number;
  max72h: number;
  min72h: number;
  rmse: number;
  generatedAt: string;
  lon: number;
};

type ForecastPoint = { sea_level_m: number };
type ForecastResponse = { forecast: ForecastPoint[]; rmse: number; generated_at: string; lon: number };

const FORECAST_API = process.env.FORECAST_API_URL ?? "http://localhost:8000";

function parseForecast(j6: ForecastResponse, j72: ForecastResponse): TidalForecast {
  const v6  = j6.forecast.map((f) => f.sea_level_m);
  const v72 = j72.forecast.map((f) => f.sea_level_m);
  return {
    next:        v6[0],
    max6h:       Math.max(...v6),
    min6h:       Math.min(...v6),
    max72h:      Math.max(...v72),
    min72h:      Math.min(...v72),
    rmse:        j6.rmse,
    generatedAt: j6.generated_at,
    lon:         j6.lon,
  };
}

/** Forecast untuk satu lokasi */
export async function getTidalForecast(lat = -7.8, lon = 110.0): Promise<TidalForecast | null> {
  try {
    const params = `lat=${lat.toFixed(5)}&lon=${lon.toFixed(5)}`;
    const [r6, r72] = await Promise.all([
      fetch(`${FORECAST_API}/forecast?horizon=6&${params}`,  { next: { revalidate: 300 } }),
      fetch(`${FORECAST_API}/forecast?horizon=72&${params}`, { next: { revalidate: 300 } }),
    ]);
    if (!r6.ok || !r72.ok) return null;
    const [j6, j72] = (await Promise.all([r6.json(), r72.json()])) as [ForecastResponse, ForecastResponse];
    return parseForecast(j6, j72);
  } catch {
    return null;
  }
}

/** Forecast per stasiun — Map<stationId, TidalForecast> */
export async function getTidalForecastPerStation(
  stations: { id: string; latitude: number; longitude: number }[],
): Promise<Map<string, TidalForecast>> {
  const results = new Map<string, TidalForecast>();
  if (stations.length === 0) return results;

  await Promise.allSettled(
    stations.map(async ({ id, latitude, longitude }) => {
      const forecast = await getTidalForecast(latitude, longitude);
      if (forecast) results.set(id, forecast);
    }),
  );
  return results;
}
