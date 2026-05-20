import { AppShell } from "@/components/dashboard/app-shell";
import { CctvGrid } from "@/components/dashboard/cctv-grid";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDashboardSummary } from "@/lib/backend/queries";
import type { CctvSnapshot, RiskStatus } from "@/lib/types";
import { CameraIcon, Clock3Icon, EyeIcon, MapPinIcon, ShieldAlertIcon } from "lucide-react";

export const dynamic = "force-dynamic";

const visibilityLabels: Record<CctvSnapshot["visibility"], string> = {
  Clear: "Jelas",
  Rain: "Hujan",
  "Low light": "Cahaya rendah",
};

const statusPriority: Record<RiskStatus, number> = {
  Normal: 0,
  Waspada: 1,
  Siaga: 2,
  Awas: 3,
};

export default async function CctvPage() {
  const summary = await getDashboardSummary();
  const snapshots = summary.cctvSnapshots;
  const prioritySnapshot =
    snapshots
      .slice()
      .sort((a, b) => statusPriority[b.status] - statusPriority[a.status])[0] ??
    snapshots[0];
  const criticalCount = snapshots.filter((snapshot) => snapshot.status !== "Normal").length;
  const lowVisibilityCount = snapshots.filter(
    (snapshot) => snapshot.visibility !== "Clear",
  ).length;
  const areaCount = new Set(snapshots.map((snapshot) => snapshot.area)).size;

  return (
    <AppShell
      activeArea={summary.activeArea}
      activePath="/cctv"
      title="CCTV Monitoring"
      updatedAt={summary.updatedAt}
    >
      <div className="grid gap-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="interactive-card">
            <CardHeader className="border-b">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>{prioritySnapshot?.name ?? "Live View Prioritas"}</CardTitle>
                  <CardDescription>
                    Feed prioritas berdasarkan status risiko visual terbaru
                  </CardDescription>
                </div>
                {prioritySnapshot ? <StatusBadge status={prioritySnapshot.status} /> : null}
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div
                className="relative aspect-video min-h-[320px] overflow-hidden rounded-lg border bg-muted shadow-sm"
                style={{
                  background: prioritySnapshot?.imageUrl
                    ? `center / cover no-repeat url("${prioritySnapshot.imageUrl}")`
                    : "linear-gradient(180deg,#b9d9ea 0 38%,#678898 38% 48%,#d8d1ba 48% 64%,#4f665e 64% 100%)",
                }}
              >
                <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-black/55 to-transparent p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="border-white/20 bg-red-600 text-white hover:bg-red-600" variant="outline">
                      <span className="size-2 animate-pulse rounded-full bg-white" />
                      LIVE
                    </Badge>
                    {prioritySnapshot ? (
                      <Badge className="border-white/20 bg-black/35 text-white hover:bg-black/35" variant="outline">
                        <MapPinIcon />
                        {prioritySnapshot.area}
                      </Badge>
                    ) : null}
                  </div>
                  {prioritySnapshot ? (
                    <Badge className="border-white/20 bg-black/35 text-white hover:bg-black/35" variant="outline">
                      <Clock3Icon />
                      {prioritySnapshot.capturedAt}
                    </Badge>
                  ) : null}
                </div>
                {prioritySnapshot ? (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/35 to-transparent p-4 text-white">
                    <div className="max-w-2xl">
                      <p className="text-lg font-semibold">{prioritySnapshot.name}</p>
                      <p className="mt-1 text-sm text-white/80">
                        Kondisi visual {visibilityLabels[prioritySnapshot.visibility]}
                        {prioritySnapshot.note ? `. ${prioritySnapshot.note}` : "."}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CameraIcon className="size-3.5" />
                    Kamera aktif
                  </div>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">{snapshots.length}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldAlertIcon className="size-3.5" />
                    Perlu pantau
                  </div>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">{criticalCount}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <EyeIcon className="size-3.5" />
                    Visibilitas rendah
                  </div>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">{lowVisibilityCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="interactive-card">
            <CardHeader className="border-b">
              <CardTitle>Ringkasan Pantauan</CardTitle>
              <CardDescription>
                {areaCount} area pesisir dalam daftar kamera
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {snapshots.slice(0, 5).map((snapshot) => (
                <article
                  className="rounded-lg border p-3 transition-colors hover:bg-muted/40"
                  key={snapshot.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{snapshot.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {snapshot.area} - {visibilityLabels[snapshot.visibility]}
                      </p>
                    </div>
                    <StatusBadge status={snapshot.status} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {snapshot.note ?? "Tidak ada catatan visual tambahan."}
                  </p>
                </article>
              ))}
            </CardContent>
          </Card>
        </div>

        <CctvGrid snapshots={snapshots} />

        <Card className="interactive-card">
          <CardHeader className="border-b">
            <CardTitle>Camera Health</CardTitle>
            <CardDescription>
              Kondisi visual dan catatan snapshot per kamera
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {snapshots.map((snapshot) => (
              <article className="rounded-lg border p-4 transition-colors hover:bg-muted/40" key={snapshot.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">{snapshot.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {snapshot.area} - {snapshot.capturedAt}
                    </p>
                  </div>
                  <StatusBadge status={snapshot.status} />
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Kondisi visual: {visibilityLabels[snapshot.visibility]}
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
