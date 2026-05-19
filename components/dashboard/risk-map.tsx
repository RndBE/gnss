"use client"

import dynamic from "next/dynamic"

import { Card, CardContent } from "@/components/ui/card"
import type { MonitoringPoint } from "@/lib/types"

const LeafletRiskMap = dynamic(() => import("./leaflet-risk-map"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[560px] place-items-center text-sm text-muted-foreground md:h-[640px]">
      Memuat peta Leaflet...
    </div>
  ),
})

export function RiskMap({ points }: { points: MonitoringPoint[] }) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardContent className="p-0">
        <LeafletRiskMap points={points} />
      </CardContent>
    </Card>
  )
}
