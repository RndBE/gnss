import { Database } from "lucide-react";

import { AppShell } from "@/components/dashboard/app-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getDatabaseTableStats,
  getDashboardSummary,
  getThresholdSettings,
  getUserRoles,
} from "@/lib/backend/queries";

export const dynamic = "force-dynamic";

export default async function PengaturanPage() {
  const [summary, thresholdSettings, userRoles, databaseStats] =
    await Promise.all([
      getDashboardSummary(),
      getThresholdSettings(),
      getUserRoles(),
      getDatabaseTableStats(),
    ]);

  return (
    <AppShell
      activeArea={summary.activeArea}
      activePath="/pengaturan"
      title="Pengaturan"
      updatedAt={summary.updatedAt}
    >
      <div className="grid gap-4">
        <Card className="interactive-card">
          <CardHeader>
            <CardTitle>Threshold Awal</CardTitle>
            <CardDescription>
              Nilai awal dari tabel threshold sistem.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead>Parameter</TableHead>
                  <TableHead>Normal</TableHead>
                  <TableHead>Waspada</TableHead>
                  <TableHead>Siaga</TableHead>
                  <TableHead>Awas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {thresholdSettings.map((setting) => (
                  <TableRow key={setting.id}>
                    <TableCell className="font-medium text-slate-950">
                      {setting.metric}
                    </TableCell>
                    <TableCell>{setting.normal}</TableCell>
                    <TableCell>{setting.waspada}</TableCell>
                    <TableCell>{setting.siaga}</TableCell>
                    <TableCell>{setting.awas}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="interactive-card">
            <CardHeader>
              <CardTitle>Role Pengguna</CardTitle>
              <CardDescription>
                Role dan akses dari database pengguna.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {userRoles.map((role) => (
                <div className="interactive-tile rounded-lg border border-slate-200 p-3" key={role.role}>
                  <div className="text-sm font-semibold text-slate-950">{role.role}</div>
                  <div className="mt-1 text-sm text-slate-600">{role.access}</div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="interactive-card">
            <CardHeader>
              <CardTitle>Statistik Database</CardTitle>
              <CardDescription>
                Jumlah record aktif per tabel operasional.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                {databaseStats.map((stat) => (
                  <div
                    className="interactive-tile flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2"
                    key={stat.table}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Database className="interactive-icon size-4 text-slate-400" />
                      <span className="truncate">{stat.table}</span>
                    </span>
                    <span className="font-medium tabular-nums text-slate-950">
                      {stat.count}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
