import { AppShell } from "@/components/dashboard/app-shell"
import { DataLoggerList } from "@/components/dashboard/data-logger-list"
import { RiskMap } from "@/components/dashboard/risk-map"
import { TrendCharts } from "@/components/dashboard/trend-charts"
import { SectionCards } from "@/components/section-cards"
import { getDashboardSummary } from "@/lib/backend/queries"

export const dynamic = "force-dynamic"

export default async function Home() {
  const summary = await getDashboardSummary()

  return (
    <AppShell
      activeArea={summary.activeArea}
      activePath="/"
      contentPadding={false}
      riskStatus={summary.kpis.floodRisk}
      updatedAt={summary.updatedAt}
    >
      <SectionCards summary={summary} />
      <div className="grid gap-3 px-4 lg:px-6">
        <div className="grid gap-3 xl:grid-cols-[3fr_1fr] xl:items-stretch">
          <RiskMap points={summary.monitoringPoints} />
          <TrendCharts trend={summary.trend} tide={summary.tide} />
        </div>
        <DataLoggerList loggers={summary.dataLoggers} />
      </div>
    </AppShell>
  )
}
