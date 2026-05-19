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
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <Card className="@container/card interactive-card">
        <CardHeader>
          <CardDescription>Penurunan Maks</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
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
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Rata-rata {summary.kpis.averageSubsidence}
            <RadioTowerIcon className="interactive-icon size-4" />
          </div>
          <div className="text-muted-foreground">
            Latest GNSS: {summary.kpis.maxSubsidenceStation}
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card interactive-card">
        <CardHeader>
          <CardDescription>Muka Air</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {summary.kpis.waterLevel}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <WavesIcon />
              AWLR
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {summary.kpis.waterLevelStation}
            <TrendingUpIcon className="interactive-icon size-4" />
          </div>
          <div className="text-muted-foreground">
            Nilai terbaru dari logger AWLR
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card interactive-card">
        <CardHeader>
          <CardDescription>Titik Aktif</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {summary.kpis.activePoints}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <ActivityIcon />
              Online
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {summary.kpis.activeLoggerDetail}
            <ActivityIcon className="interactive-icon size-4" />
          </div>
          <div className="text-muted-foreground">
            Status dihitung dari data logger backend
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card interactive-card">
        <CardHeader>
          <CardDescription>Alarm Aktif</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {summary.kpis.activeAlarms} Alarm
          </CardTitle>
          <CardAction>
            <Badge
              variant={summary.kpis.activeAlarms > 0 ? "destructive" : "outline"}
            >
              <SirenIcon />
              Event
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Open dan In Progress
            <SirenIcon className="interactive-icon size-4" />
          </div>
          <div className="text-muted-foreground">
            Sumber dari tabel alarm backend
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
