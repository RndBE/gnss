import { AppShell } from "@/components/dashboard/app-shell"
import { DataLoggerList } from "@/components/dashboard/data-logger-list"
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
      <div className="px-4 lg:px-6">
        <DataLoggerList loggers={summary.dataLoggers} />
      </div>
    </AppShell>
  )
}
