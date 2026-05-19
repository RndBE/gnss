import { AppShell } from "@/components/dashboard/app-shell";
import { RiskMap } from "@/components/dashboard/risk-map";
import { getDashboardSummary } from "@/lib/backend/queries";

export const dynamic = "force-dynamic";

export default async function PetaRisikoPage() {
  const summary = await getDashboardSummary();

  return (
    <AppShell
      activeArea={summary.activeArea}
      activePath="/peta-risiko"
      title="Peta Risiko Pesisir"
      updatedAt={summary.updatedAt}
    >
      <div className="grid gap-4">
        <RiskMap points={summary.monitoringPoints} />
      </div>
    </AppShell>
  );
}
