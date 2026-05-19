import { Battery, Radio, Wifi } from "lucide-react";

import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DeviceTelemetry } from "@/lib/types";

const statusVariant = {
  Online: "Normal",
  Weak: "Waspada",
  Offline: "Awas",
  Maintenance: "Siaga",
} as const;

export function DeviceTable({ devices }: { devices: DeviceTelemetry[] }) {
  return (
    <Card className="interactive-card">
      <CardHeader>
        <div>
          <CardTitle>Status Perangkat</CardTitle>
          <CardDescription>
            Logger, baterai, sinyal, dan data terakhir
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead>Perangkat</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Baterai</TableHead>
              <TableHead>Sinyal</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {devices.map((device) => (
                <TableRow className="group/device" key={device.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="interactive-tile flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 ring-1 ring-slate-200 group-hover/device:text-slate-950">
                        <Radio className="interactive-icon size-4" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-950">{device.name}</div>
                        <div className="text-xs text-slate-500">{device.type}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={statusVariant[device.status]} />
                  </TableCell>
                  <TableCell className="min-w-32">
                    <div className="flex items-center gap-2">
                      <Battery className="interactive-icon size-4 text-slate-400" />
                      <Progress value={device.battery} />
                      <span className="w-8 text-xs text-slate-500">{device.battery}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-32">
                    <div className="flex items-center gap-2">
                      <Wifi className="interactive-icon size-4 text-slate-400" />
                      <Progress value={device.signal} />
                      <span className="w-8 text-xs text-slate-500">{device.signal}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500">{device.lastData}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
