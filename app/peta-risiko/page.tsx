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
      contentPadding={false}
      title="Peta Risiko Pesisir"
      updatedAt={summary.updatedAt}
    >
      <div
        className="px-4 pb-4 lg:px-6"
        style={{ height: "calc(100svh - var(--header-height))" }}
      >
        <RiskMap points={summary.monitoringPoints} />
      </div>
    </AppShell>
  );
}
