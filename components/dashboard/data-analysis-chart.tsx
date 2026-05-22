"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

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

function getDomain(
  data: Array<GnssTrendPoint | AwlrTrendPoint>,
  mode: DataAnalysisMode,
  parameter: GnssParameter | AwlrParameter,
  thresholds?: AwlrThresholdProfile,
) {
  if (mode === "awlr") {
    const readings = data
      .map((item) => ("waterLevel" in item ? item.waterLevel : null))
      .filter((value): value is number => typeof value === "number");
    const thresholdValues = thresholds
      ? [thresholds.waspada, thresholds.siaga, thresholds.awas]
      : [];
    const values = [...readings, ...thresholdValues];
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
}: DataAnalysisChartProps) {
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

  return (
    <Card className="@container/card interactive-card min-w-0">
      <CardHeader className="pb-2 px-3">
        <div>
          <CardTitle className="text-sm">Analisis Tren Per Pos</CardTitle>
          <CardDescription className="text-xs">
            {stationName} · {chartConfig[parameter].label} · {granularity === "daily" ? "Harian" : "Per jam"}
          </CardDescription>
        </div>
        <CardAction className="text-sm font-semibold tabular-nums">
          {latestValue}
        </CardAction>
      </CardHeader>
      <CardContent className="min-w-0 px-2 pb-3 pt-1 sm:px-4">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[240px] min-h-[240px] w-full min-w-0"
        >
          <AreaChart data={data} margin={{ left: 8, right: 8 }}>
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
              domain={getDomain(data, mode, parameter, thresholds)}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={48}
              label={{
                value: axisLabels[parameter],
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
            {thresholdLines.map((line) => (
              <ReferenceLine
                ifOverflow="extendDomain"
                key={line.key}
                y={line.value}
                stroke={line.color}
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `${line.label} ${line.value.toFixed(2)} ${thresholds?.unit ?? axisLabels[parameter]}`,
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
