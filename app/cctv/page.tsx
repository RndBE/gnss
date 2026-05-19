import { AppShell } from "@/components/dashboard/app-shell";
import { CctvGrid } from "@/components/dashboard/cctv-grid";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardSummary } from "@/lib/backend/queries";

export const dynamic = "force-dynamic";

export default async function CctvPage() {
  const summary = await getDashboardSummary();
  const prioritySnapshot = summary.cctvSnapshots[0];

  return (
    <AppShell
      activeArea={summary.activeArea}
      activePath="/cctv"
      title="CCTV Monitoring"
      updatedAt={summary.updatedAt}
    >
      <div className="grid gap-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card className="interactive-card">
            <CardHeader>
              <CardTitle>{prioritySnapshot?.name ?? "Live View Prioritas"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="relative aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-200 transition-transform duration-300 ease-out hover:scale-[1.01]"
                style={{
                  background: prioritySnapshot?.imageUrl
                    ? `center / cover no-repeat url("${prioritySnapshot.imageUrl}")`
                    : "linear-gradient(180deg,#b9d9ea 0 38%,#678898 38% 48%,#d8d1ba 48% 64%,#4f665e 64% 100%)",
                }}
              >
                <div className="absolute left-3 top-3 flex items-center gap-2 rounded-md bg-white/90 px-2 py-1 text-xs text-slate-700">
                  <span className="size-2 animate-pulse rounded-full bg-red-600" />
                  LIVE {prioritySnapshot?.name ?? "CCTV"}
                </div>
                {prioritySnapshot ? (
                  <div className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
                    Timestamp {prioritySnapshot.capturedAt}
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
          <CctvGrid snapshots={summary.cctvSnapshots} />
        </div>

        <Card className="interactive-card">
          <CardHeader>
            <CardTitle>Camera Health</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {summary.cctvSnapshots.map((snapshot) => (
              <article className="interactive-card rounded-lg border border-slate-200 p-4" key={snapshot.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">
                      {snapshot.name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {snapshot.area} - snapshot {snapshot.capturedAt}
                    </p>
                  </div>
                  <StatusBadge status={snapshot.status} />
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  Kondisi visual: {snapshot.visibility}
                  {snapshot.note ? `. ${snapshot.note}` : "."}
                </p>
              </article>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
