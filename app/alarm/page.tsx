import { AlarmList } from "@/components/dashboard/alarm-list";
import { AlarmThresholdManager } from "@/components/dashboard/alarm-threshold-manager";
import { AppShell } from "@/components/dashboard/app-shell";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getAlarmThresholdSettings,
  getDashboardSummary,
} from "@/lib/backend/queries";

export const dynamic = "force-dynamic";

export default async function AlarmPage() {
  const [summary, thresholds] = await Promise.all([
    getDashboardSummary(),
    getAlarmThresholdSettings(),
  ]);

  return (
    <AppShell
      activeArea={summary.activeArea}
      activePath="/alarm"
      title="Alarm & Event"
      updatedAt={summary.updatedAt}
    >
      <div className="grid gap-4">
        <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
          <AlarmList alarms={summary.alarms} />
          <Card className="interactive-card">
            <CardHeader>
              <CardTitle>Riwayat Alarm</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead>ID</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Waktu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.alarms.map((alarm) => (
                    <TableRow key={alarm.id}>
                      <TableCell className="font-medium text-slate-950">
                        {alarm.id}
                      </TableCell>
                      <TableCell>{alarm.type}</TableCell>
                      <TableCell>{alarm.area}</TableCell>
                      <TableCell>
                        <StatusBadge status={alarm.status} />
                      </TableCell>
                      <TableCell>{alarm.state}</TableCell>
                      <TableCell className="text-slate-500">{alarm.time}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <AlarmThresholdManager thresholds={thresholds} />
      </div>
    </AppShell>
  );
}
