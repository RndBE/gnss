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
import type { GnssParameter, GnssTrendPoint } from "@/lib/types";

type GnssParameterChartProps = {
  data: GnssTrendPoint[];
  parameter: GnssParameter;
  stationName: string;
  latestValue: string;
};

const chartConfig = {
  x: {
    label: "X / Easting",
    color: "var(--chart-1)",
  },
  y: {
    label: "Y / Northing",
    color: "var(--chart-2)",
  },
  z: {
    label: "Z / Up",
    color: "var(--chart-3)",
  },
  velocity: {
    label: "Velocity",
    color: "var(--chart-4)",
  },
  subsidence: {
    label: "Akumulasi turun",
    color: "var(--chart-1)",
  },
  pdop: {
    label: "PDOP",
    color: "var(--chart-5)",
  },
  fixRatio: {
    label: "Fix ratio",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const axisLabels: Record<GnssParameter, string> = {
  x: "mm",
  y: "mm",
  z: "mm",
  velocity: "cm/tahun",
  subsidence: "cm",
  pdop: "PDOP",
  fixRatio: "%",
};

export function GnssParameterChart({
  data,
  parameter,
  stationName,
  latestValue,
}: GnssParameterChartProps) {
  const yDomain =
    parameter === "velocity"
      ? [-10, 0]
      : parameter === "z"
        ? [-90, 0]
        : parameter === "subsidence"
          ? [-40, 0]
        : parameter === "pdop"
          ? [0, 4]
          : parameter === "fixRatio"
            ? [50, 100]
            : ["auto", "auto"];

  return (
    <Card className="@container/card">
      <CardHeader>
        <div>
          <CardTitle>Analisis Tren Per Pos</CardTitle>
          <CardDescription>
            {stationName} - {chartConfig[parameter].label}
          </CardDescription>
        </div>
        <CardAction className="text-sm font-semibold tabular-nums">
          {latestValue}
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[320px] w-full"
        >
          <AreaChart data={data} margin={{ left: 8, right: 8 }}>
            <defs>
              <linearGradient id="fillGnssAxis" x1="0" y1="0" x2="0" y2="1">
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
              domain={yDomain}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={48}
              tickFormatter={(value) => `${value}`}
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
              fill="url(#fillGnssAxis)"
              stroke={`var(--color-${parameter})`}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
