"use client";

import { useState, useCallback } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { Waves } from "lucide-react";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type {
  AnalysisGranularity,
  AwlrParameter,
  AwlrThresholdProfile,
  AwlrTrendPoint,
  DataAnalysisMode,
  GnssParameter,
  GnssTrendPoint,
} from "@/lib/types";

type DataAnalysisChartProps = {
  data: Array<GnssTrendPoint | AwlrTrendPoint>;
  mode: DataAnalysisMode;
  parameter: GnssParameter | AwlrParameter;
  stationName: string;
  latestValue: string;
  granularity: AnalysisGranularity;
  thresholds?: AwlrThresholdProfile;
  lat?: number;
  lon?: number;
};

const chartConfig = {
  x: { label: "X / Easting", color: "var(--chart-1)" },
  y: { label: "Y / Northing", color: "var(--chart-2)" },
  z: { label: "Z / Up", color: "var(--chart-3)" },
  velocity: { label: "Velocity", color: "var(--chart-4)" },
  subsidence: { label: "Akumulasi turun", color: "var(--chart-1)" },
  pdop: { label: "PDOP", color: "var(--chart-5)" },
  fixRatio: { label: "Fix ratio", color: "var(--chart-2)" },
  waterLevel: { label: "Muka air", color: "var(--chart-1)" },
  forecast: { label: "Prediksi pasut", color: "var(--chart-4)" },
  waspada: { label: "Waspada", color: "var(--chart-2)" },
  siaga: { label: "Siaga", color: "var(--chart-3)" },
  awas: { label: "Awas", color: "var(--chart-4)" },
} satisfies ChartConfig;

const axisLabels: Record<GnssParameter | AwlrParameter, string> = {
  x: "mm",
  y: "mm",
  z: "mm",
  velocity: "cm/tahun",
  subsidence: "cm",
  pdop: "PDOP",
  fixRatio: "%",
  waterLevel: "m",
};

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];

function formatForecastPeriod(isoString: string): string {
  const d = new Date(isoString + ":00Z");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = MONTHS_ID[d.getUTCMonth()];
  const hour = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  return `${day} ${month} ${hour}.${min}`;
}

type ChartPoint = {
  period: string;
  waterLevel?: number;
  forecast?: number;
  [key: string]: string | number | undefined;
};

function getDomain(
  data: Array<GnssTrendPoint | AwlrTrendPoint>,
  mode: DataAnalysisMode,
  parameter: GnssParameter | AwlrParameter,
  thresholds?: AwlrThresholdProfile,
  forecastValues?: number[],
) {
  if (mode === "awlr") {
    const readings = data
      .map((item) => ("waterLevel" in item ? item.waterLevel : null))
      .filter((value): value is number => typeof value === "number");
    const thresholdValues = thresholds
      ? [thresholds.waspada, thresholds.siaga, thresholds.awas]
      : [];
    const values = [...readings, ...thresholdValues, ...(forecastValues ?? [])];
    const min = values.length > 0 ? Math.min(...values) : 1;
    const max = values.length > 0 ? Math.max(...values) : 2.2;
    const padding = Math.max((max - min) * 0.2, 0.12);

    return [
      Math.max(0, Number((min - padding).toFixed(2))),
      Number((max + padding).toFixed(2)),
    ];
  }

  if (parameter === "velocity") {
    const readings = data
      .map((item) => ("velocity" in item ? item.velocity : null))
      .filter((value): value is number => typeof value === "number");
    const thresholdValues = thresholds
      ? [-thresholds.waspada, -thresholds.siaga, -thresholds.awas]
      : [];
    const values = [...readings, ...thresholdValues, 0];
    const min = values.length > 0 ? Math.min(...values) : -10;
    const padding = Math.max(Math.abs(min) * 0.12, 0.8);

    return [Number((min - padding).toFixed(1)), 0];
  }
  if (parameter === "z") return [-90, 0];
  if (parameter === "subsidence") {
    const readings = data
      .map((item) => ("subsidence" in item ? item.subsidence : null))
      .filter((value): value is number => typeof value === "number");
    const min = readings.length > 0 ? Math.min(...readings, 0) : -10;
    const max = readings.length > 0 ? Math.max(...readings, 0) : 0;
    const padding = Math.max((max - min) * 0.14, 0.8);

    return [Number((min - padding).toFixed(1)), Number((max + padding).toFixed(1))];
  }
  if (parameter === "pdop") return [0, 4];
  if (parameter === "fixRatio") return [50, 100];
  return ["auto", "auto"];
}

export function DataAnalysisChart({
  data,
  mode,
  parameter,
  stationName,
  latestValue,
  granularity,
  thresholds,
  lat = -7.8,
  lon = 110.0,
}: DataAnalysisChartProps) {
  const [showForecast, setShowForecast] = useState(false);
  const [forecastPoints, setForecastPoints] = useState<ChartPoint[]>([]);
  const [forecastKey, setForecastKey] = useState("");
  const [loadingForecast, setLoadingForecast] = useState(false);

  // Reset cache forecast saat stasiun atau parameter berubah
  const cacheKey = `${stationName}|${lat}|${lon}`;
  if (forecastKey !== cacheKey && forecastPoints.length > 0) {
    setForecastPoints([]);
    setShowForecast(false);
    setForecastKey(cacheKey);
  }

  const canShowForecast = mode === "awlr" && parameter === "waterLevel";

  const toggleForecast = useCallback(async () => {
    if (showForecast) {
      setShowForecast(false);
      return;
    }
    if (forecastPoints.length > 0) {
      setShowForecast(true);
      return;
    }
    setLoadingForecast(true);
    try {
      const res = await fetch(
        `/api/tidal/forecast?horizon=72&lat=${lat}&lon=${lon}`
      );
      const json = await res.json();
      const raw = json.forecast as { datetime: string; sea_level_m: number }[];

      // Koreksi datum + amplitudo:
      // Model dilatih dari data sintetis sehingga mean dan amplitudonya tidak
      // cocok dengan stasiun nyata. Kita selaraskan keduanya dengan data historis.
      const histValues = data
        .slice(-Math.min(data.length, 60))
        .map((d) => ("waterLevel" in d ? d.waterLevel : null))
        .filter((v): v is number => v !== null);

      const histMean = histValues.length > 0
        ? histValues.reduce((a, b) => a + b, 0) / histValues.length
        : 0;
      const histStd = histValues.length > 1
        ? Math.sqrt(histValues.reduce((s, v) => s + (v - histMean) ** 2, 0) / histValues.length)
        : 0.1;

      const fMean = raw.reduce((a, b) => a + b.sea_level_m, 0) / raw.length;
      const fStd = Math.sqrt(
        raw.reduce((s, f) => s + (f.sea_level_m - fMean) ** 2, 0) / raw.length
      );

      // Normalisasi forecast lalu skala ke distribusi historis
      // forecast_corrected = histMean + (raw - fMean) / fStd * histStd
      const ampScale = fStd > 0.001 ? histStd / fStd : 1;

      const points: ChartPoint[] = raw.map((f) => ({
        period: formatForecastPeriod(f.datetime),
        forecast: Math.round((histMean + (f.sea_level_m - fMean) * ampScale) * 10000) / 10000,
      }));
      setForecastPoints(points);
      setShowForecast(true);
    } finally {
      setLoadingForecast(false);
    }
  }, [showForecast, forecastPoints, lat, lon, data]);

  const thresholdLines =
    thresholds && (mode === "awlr" || parameter === "velocity")
      ? [
          {
            key: "waspada",
            label: "Waspada",
            value: mode === "awlr" ? thresholds.waspada : -thresholds.waspada,
            color: "var(--color-waspada)",
          },
          {
            key: "siaga",
            label: "Siaga",
            value: mode === "awlr" ? thresholds.siaga : -thresholds.siaga,
            color: "var(--color-siaga)",
          },
          {
            key: "awas",
            label: "Awas",
            value: mode === "awlr" ? thresholds.awas : -thresholds.awas,
            color: "var(--color-awas)",
          },
        ]
      : [];

  // Merge historical + forecast into one array untuk x-axis tunggal
  const historicalPoints: ChartPoint[] = data.map((item) => ({
    ...item,
    period: item.period,
  }));

  const mergedData: ChartPoint[] = showForecast && forecastPoints.length > 0
    ? [...historicalPoints, ...forecastPoints]
    : historicalPoints;

  const forecastValues = showForecast
    ? forecastPoints.map((p) => p.forecast).filter((v): v is number => v !== undefined)
    : [];

  return (
    <Card className="@container/card interactive-card min-w-0">
      <CardHeader className="pb-2 px-3">
        <div>
          <CardTitle className="text-sm">Analisis Tren Per Pos</CardTitle>
          <CardDescription className="text-xs">
            {stationName} · {chartConfig[parameter as keyof typeof chartConfig]?.label} · {granularity === "daily" ? "Harian" : "Per jam"}
          </CardDescription>
        </div>
        <CardAction className="flex items-center gap-2">
          {canShowForecast && (
            <button
              onClick={toggleForecast}
              disabled={loadingForecast}
              title={showForecast ? "Sembunyikan prediksi pasut" : "Tampilkan prediksi pasut 72 jam"}
              className={[
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                showForecast
                  ? "border-[var(--color-forecast)] bg-[var(--color-forecast)]/10 text-[var(--color-forecast)]"
                  : "border-border text-muted-foreground hover:border-[var(--color-forecast)] hover:text-[var(--color-forecast)]",
                loadingForecast ? "opacity-50 cursor-wait" : "cursor-pointer",
              ].join(" ")}
            >
              <Waves className="size-3" />
              {loadingForecast ? "Memuat..." : "Prediksi"}
            </button>
          )}
          <span className="text-sm font-semibold tabular-nums">{latestValue}</span>
        </CardAction>
      </CardHeader>
      <CardContent className="min-w-0 px-2 pb-3 pt-1 sm:px-4">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[240px] min-h-[240px] w-full min-w-0"
        >
          <AreaChart data={mergedData} margin={{ left: 8, right: 8 }}>
            <defs>
              <linearGradient id="fillAnalysis" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={`var(--color-${parameter})`}
                  stopOpacity={0.75}
                />
                <stop
                  offset="95%"
                  stopColor={`var(--color-${parameter})`}
                  stopOpacity={0.08}
                />
              </linearGradient>
              <linearGradient id="fillForecast" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-forecast)"
                  stopOpacity={0.65}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-forecast)"
                  stopOpacity={0.06}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="period"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={16}
            />
            <YAxis
              domain={getDomain(data, mode, parameter, thresholds, forecastValues)}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={48}
              label={{
                value: axisLabels[parameter as keyof typeof axisLabels] ?? "",
                angle: -90,
                position: "insideLeft",
                offset: 0,
              }}
            />
            <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="4 4" />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Area
              dataKey={parameter}
              type="natural"
              fill="url(#fillAnalysis)"
              stroke={`var(--color-${parameter})`}
              strokeWidth={2}
            />
            {showForecast && (
              <Area
                dataKey="forecast"
                type="natural"
                fill="url(#fillForecast)"
                stroke="var(--color-forecast)"
                strokeWidth={2}
                strokeDasharray="5 3"
                connectNulls={false}
              />
            )}
            {thresholdLines.map((line) => (
              <ReferenceLine
                ifOverflow="extendDomain"
                key={line.key}
                y={line.value}
                stroke={line.color}
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `${line.label} ${line.value.toFixed(2)} ${thresholds?.unit ?? axisLabels[parameter as keyof typeof axisLabels] ?? ""}`,
                  position: "insideTopRight",
                  fill: "var(--muted-foreground)",
                  fontSize: 12,
                }}
              />
            ))}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
