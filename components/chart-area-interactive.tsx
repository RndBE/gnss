"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { DashboardSummary } from "@/lib/types"

export const description = "Grafik interaktif GNSS dan AWLR"

const chartConfig = {
  waterLevel: {
    label: "Muka Air",
    color: "var(--chart-1)",
  },
  waspada: {
    label: "Waspada",
    color: "var(--chart-2)",
  },
  siaga: {
    label: "Siaga",
    color: "var(--chart-3)",
  },
  gnssPkl01: {
    label: "PKL-01",
    color: "var(--chart-1)",
  },
  gnssSmg02: {
    label: "SMG-02",
    color: "var(--chart-2)",
  },
  gnssDmk03: {
    label: "DMK-03",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

type ChartMode = "awlr" | "gnss"

type ChartDatum = {
  period: string
  waterLevel?: number
  waspada?: number
  siaga?: number
  gnssPkl01?: number
  gnssSmg02?: number
  gnssDmk03?: number
}

type ChartAreaInteractiveProps = {
  summary: DashboardSummary
}

export function ChartAreaInteractive({ summary }: ChartAreaInteractiveProps) {
  const [mode, setMode] = React.useState<ChartMode>("awlr")
  const chartData: ChartDatum[] =
    mode === "awlr"
      ? summary.tide.map((item) => ({
          period: item.hour,
          waterLevel: item.waterLevel,
          waspada: item.waspada,
          siaga: item.siaga,
        }))
      : summary.trend.map((item) => ({
          period: item.period,
          gnssPkl01: Math.abs(item.gnssPkl01),
          gnssSmg02: Math.abs(item.gnssSmg02),
          gnssDmk03: Math.abs(item.gnssDmk03),
        }))

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Trend Monitoring</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Data AWLR dan laju penurunan GNSS dari database
          </span>
          <span className="@[540px]/card:hidden">AWLR dan GNSS</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            multiple={false}
            value={[mode]}
            onValueChange={(value) => {
              setMode((value[0] as ChartMode | undefined) ?? "awlr")
            }}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="awlr">AWLR</ToggleGroupItem>
            <ToggleGroupItem value="gnss">GNSS</ToggleGroupItem>
          </ToggleGroup>
          <Select
            value={mode}
            onValueChange={(value) => {
              setMode(value as ChartMode)
            }}
          >
            <SelectTrigger
              className="flex w-32 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Pilih seri"
            >
              <SelectValue placeholder="AWLR" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="awlr" className="rounded-lg">
                AWLR
              </SelectItem>
              <SelectItem value="gnss" className="rounded-lg">
                GNSS
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fillWaterLevel" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-waterLevel)"
                  stopOpacity={0.9}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-waterLevel)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillGnssPkl01" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-gnssPkl01)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-gnssPkl01)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="period"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            {mode === "awlr" ? (
              <>
                <Area
                  dataKey="waterLevel"
                  type="natural"
                  fill="url(#fillWaterLevel)"
                  stroke="var(--color-waterLevel)"
                />
                <Area
                  dataKey="waspada"
                  type="natural"
                  fill="transparent"
                  stroke="var(--color-waspada)"
                  strokeDasharray="4 4"
                />
                <Area
                  dataKey="siaga"
                  type="natural"
                  fill="transparent"
                  stroke="var(--color-siaga)"
                  strokeDasharray="4 4"
                />
              </>
            ) : (
              <>
                <Area
                  dataKey="gnssPkl01"
                  type="natural"
                  fill="url(#fillGnssPkl01)"
                  stroke="var(--color-gnssPkl01)"
                />
                <Area
                  dataKey="gnssSmg02"
                  type="natural"
                  fill="transparent"
                  stroke="var(--color-gnssSmg02)"
                />
                <Area
                  dataKey="gnssDmk03"
                  type="natural"
                  fill="transparent"
                  stroke="var(--color-gnssDmk03)"
                />
              </>
            )}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
