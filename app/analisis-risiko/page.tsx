import { AppShell } from "@/components/dashboard/app-shell";
import { RiskPanel } from "@/components/dashboard/risk-panel";
import { RiskWeightManager } from "@/components/dashboard/risk-weight-manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getDashboardSummary,
  getRiskWeights,
} from "@/lib/backend/queries";

export const dynamic = "force-dynamic";

export default async function AnalisisRisikoPage() {
  const [summary, riskWeights] = await Promise.all([
    getDashboardSummary(),
    getRiskWeights(),
  ]);
  const sortedAreas = [...summary.riskAreas].sort((a, b) => b.score - a.score);
  const topArea = sortedAreas[0];
  const activeAlarm = summary.alarms.find((alarm) => alarm.state !== "Resolved");
  const dominantWeights = riskWeights
    .slice()
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2)
    .map((item) => item.metric)
    .join(" dan ");

  return (
    <AppShell
      activeArea={summary.activeArea}
      activePath="/analisis-risiko"
      title="Analisis Risiko"
      updatedAt={summary.updatedAt}
    >
      <div className="grid gap-4">
        <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
          <RiskPanel areas={summary.riskAreas} />
          <RiskWeightManager weights={riskWeights} />
        </div>

        <Card className="interactive-card">
          <CardHeader>
            <CardTitle>Ringkasan Analisis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-slate-600">
              {topArea
                ? `${topArea.area} memiliki skor tertinggi ${topArea.score}/100 dengan status ${topArea.status}. Komponen bobot terbesar saat ini adalah ${dominantWeights || "belum tersedia"}. ${
                    activeAlarm
                      ? `Alarm aktif terakhir: ${activeAlarm.type} di ${activeAlarm.area}.`
                      : "Tidak ada alarm aktif saat ini."
                  }`
                : "Belum ada area monitoring di database."}
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
