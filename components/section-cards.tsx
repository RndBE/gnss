"use client"

import {
  ActivityIcon,
  RadioTowerIcon,
  SirenIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  WavesIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { DashboardSummary } from "@/lib/types"

type SectionCardsProps = {
  summary: DashboardSummary
}

export function SectionCards({ summary }: SectionCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 px-4 *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card interactive-card border-rose-200/70 bg-gradient-to-br from-rose-50/90 via-card to-card">
        <CardHeader>
          <CardDescription>Penurunan Maks</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums text-rose-950 @[250px]/card:text-3xl">
            {summary.kpis.maxSubsidence}
          </CardTitle>
          <CardAction>
            <Badge
              variant={
                summary.kpis.floodRisk === "Awas" ? "destructive" : "outline"
              }
            >
              <TrendingDownIcon />
              {summary.kpis.floodRisk}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 border-rose-100 bg-rose-50/45 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium text-rose-950">
            Rata-rata {summary.kpis.averageSubsidence}
            <RadioTowerIcon className="interactive-icon size-4 text-rose-600" />
          </div>
          <div className="text-muted-foreground">
            Latest GNSS: {summary.kpis.maxSubsidenceStation}
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card interactive-card border-sky-200/70 bg-gradient-to-br from-sky-50/90 via-card to-card">
        <CardHeader>
          <CardDescription>Muka Air</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums text-sky-950 @[250px]/card:text-3xl">
            {summary.kpis.waterLevel}
          </CardTitle>
          <CardAction>
            <Badge className="border-sky-200 bg-sky-50 text-sky-700" variant="outline">
              <WavesIcon />
              AWLR
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 border-sky-100 bg-sky-50/45 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium text-sky-950">
            {summary.kpis.waterLevelStation}
            <TrendingUpIcon className="interactive-icon size-4 text-sky-600" />
          </div>
          <div className="text-muted-foreground">
            Nilai terbaru dari logger AWLR
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card interactive-card border-emerald-200/70 bg-gradient-to-br from-emerald-50/90 via-card to-card">
        <CardHeader>
          <CardDescription>Titik Aktif</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums text-emerald-950 @[250px]/card:text-3xl">
            {summary.kpis.activePoints}
          </CardTitle>
          <CardAction>
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700" variant="outline">
              <ActivityIcon />
              Online
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 border-emerald-100 bg-emerald-50/45 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium text-emerald-950">
            {summary.kpis.activeLoggerDetail}
            <ActivityIcon className="interactive-icon size-4 text-emerald-600" />
          </div>
          <div className="text-muted-foreground">
            Status dihitung dari data logger backend
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card interactive-card border-amber-200/70 bg-gradient-to-br from-amber-50/90 via-card to-card">
        <CardHeader>
          <CardDescription>Alarm Aktif</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums text-amber-950 @[250px]/card:text-3xl">
            {summary.kpis.activeAlarms} Alarm
          </CardTitle>
          <CardAction>
            <Badge
              className="border-red-200 bg-red-50 text-red-700"
              variant={summary.kpis.activeAlarms > 0 ? "destructive" : "outline"}
            >
              <SirenIcon />
              Event
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 border-amber-100 bg-amber-50/45 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium text-amber-950">
            Open dan In Progress
            <SirenIcon className="interactive-icon size-4 text-amber-600" />
          </div>
          <div className="text-muted-foreground">
            Sumber dari tabel alarm backend
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
