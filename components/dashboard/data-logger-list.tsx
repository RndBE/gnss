import Link from "next/link";
import {
  BatteryCharging,
  Clock3,
  Database,
  RadioTower,
  Signal,
  Waves,
} from "lucide-react";

import { StatusBadge } from "@/components/dashboard/status-badge";
import { Badge } from "@/components/ui/badge";
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
import type { DataLoggerFeed, DeviceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type DataLoggerListProps = {
  loggers: DataLoggerFeed[];
};

const deviceStatusClasses: Record<DeviceStatus, string> = {
  Online:
    "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
  Weak: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-50",
  Offline: "border-red-200 bg-red-50 text-red-700 hover:bg-red-50",
  Maintenance:
    "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50",
};

const loggerTypeAccent: Record<
  DataLoggerFeed["pointType"],
  { badge: string; tile: string; parameter: string; progress: string }
> = {
  GNSS: {
    badge: "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-50",
    tile:
      "border-indigo-200 bg-indigo-50 text-indigo-700 group-hover/logger:border-indigo-300 group-hover/logger:bg-indigo-100/70",
    parameter:
      "border-indigo-100 bg-indigo-50/35 hover:border-indigo-300 hover:bg-indigo-50",
    progress: "[&_[data-slot=progress-indicator]]:bg-indigo-500",
  },
  AWLR: {
    badge: "border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-50",
    tile:
      "border-cyan-200 bg-cyan-50 text-cyan-700 group-hover/logger:border-cyan-300 group-hover/logger:bg-cyan-100/70",
    parameter:
      "border-cyan-100 bg-cyan-50/35 hover:border-cyan-300 hover:bg-cyan-50",
    progress: "[&_[data-slot=progress-indicator]]:bg-cyan-500",
  },
};

const gnssAnalysisParameters = new Set([
  "x",
  "y",
  "z",
  "velocity",
  "pdop",
  "fixRatio",
]);

const awlrAnalysisParameters = new Set(["waterLevel"]);

function TelemetryValue({
  icon: Icon,
  label,
  value,
  progressClassName,
}: {
  icon: typeof BatteryCharging;
  label: string;
  value: number | null;
  progressClassName?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Icon className="size-3" />
          {label}
        </span>
        <span className="font-medium tabular-nums">
          {value == null ? "-" : `${value}%`}
        </span>
      </div>
      <Progress className={cn(progressClassName)} value={value ?? 0} />
    </div>
  );
}

export function DataLoggerList({ loggers }: DataLoggerListProps) {
  return (
    <Card className="interactive-card">
      <CardHeader className="border-b pb-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-sky-500 shadow-[0_0_0_4px_rgb(14_165_233_/_0.12)]" />
              <CardTitle>Data Logger Sistem</CardTitle>
            </div>
            <CardDescription>
              GNSS dan AWLR dengan interval pengukuran 1 menit
            </CardDescription>
          </div>
          <Badge className="border-sky-200 bg-white/80 text-sky-700" variant="outline">
            <Database />
            {loggers.length} Logger
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="min-w-[240px]">Logger</TableHead>
                <TableHead className="min-w-[180px]">Lokasi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="min-w-[360px]">
                  Pengukuran Terbaru
                </TableHead>
                <TableHead className="min-w-[180px]">Telemetri</TableHead>
                <TableHead className="min-w-[150px]">Update</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loggers.map((logger) => {
                const TypeIcon = logger.pointType === "GNSS" ? RadioTower : Waves;
                const accent = loggerTypeAccent[logger.pointType];

                return (
                  <TableRow className="group/logger" key={logger.id}>
                    <TableCell>
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "interactive-tile flex size-9 shrink-0 items-center justify-center rounded-lg border",
                            accent.tile,
                          )}
                        >
                          <TypeIcon className="interactive-icon size-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{logger.name}</p>
                            <Badge className={accent.badge} variant="outline">
                              {logger.pointType}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {logger.pointName} · {logger.id}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Firmware {logger.firmwareVersion}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{logger.area}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {logger.coordinate}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-2">
                        <Badge
                          className={cn(
                            "border",
                            deviceStatusClasses[logger.status],
                          )}
                          variant="outline"
                        >
                          {logger.status}
                        </Badge>
                        <StatusBadge status={logger.pointStatus} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {logger.parameters.map((parameter) => {
                          const href =
                            logger.pointType === "GNSS" &&
                            gnssAnalysisParameters.has(parameter.key)
                              ? `/analisa-data?sensor=gnss&pos=${logger.pointId}&parameter=${parameter.key}&range=180d`
                              : logger.pointType === "AWLR" &&
                                  awlrAnalysisParameters.has(parameter.key)
                                ? `/analisa-data?sensor=awlr&pos=${logger.pointId}&parameter=${parameter.key}&range=180d`
                              : null;
                          const content = (
                            <>
                              <p className="text-[11px] font-medium text-muted-foreground">
                                {parameter.label}
                              </p>
                              <p className="mt-1 text-sm font-semibold tabular-nums">
                                {parameter.value}
                              </p>
                            </>
                          );

                          return href ? (
                            <Link
                              className={cn(
                                "interactive-tile rounded-md border px-2.5 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                accent.parameter,
                              )}
                              href={href}
                              key={parameter.key}
                            >
                              {content}
                            </Link>
                          ) : (
                            <div
                              className={cn(
                                "interactive-tile rounded-md border px-2.5 py-2",
                                accent.parameter,
                              )}
                              key={parameter.key}
                            >
                              {content}
                            </div>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-3">
                        <TelemetryValue
                          icon={BatteryCharging}
                          label="Baterai"
                          progressClassName={accent.progress}
                          value={logger.battery}
                        />
                        <TelemetryValue
                          icon={Signal}
                          label="Sinyal"
                          progressClassName={accent.progress}
                          value={logger.signal}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 whitespace-nowrap text-sm">
                        <Clock3 className="size-3.5 text-muted-foreground" />
                        {logger.lastData}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
