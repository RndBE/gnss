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
}: {
  icon: typeof BatteryCharging;
  label: string;
  value: number | null;
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
      <Progress value={value ?? 0} />
    </div>
  );
}

export function DataLoggerList({ loggers }: DataLoggerListProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Data Logger Sistem</CardTitle>
            <CardDescription>
              GNSS dan AWLR dengan interval pengukuran 1 menit
            </CardDescription>
          </div>
          <Badge variant="outline">
            <Database />
            {loggers.length} Logger
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
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

                return (
                  <TableRow className="group/logger" key={logger.id}>
                    <TableCell>
                      <div className="flex items-start gap-3">
                        <div className="interactive-tile flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/40 group-hover/logger:border-primary/20 group-hover/logger:bg-primary/5">
                          <TypeIcon className="interactive-icon size-4 text-muted-foreground group-hover/logger:text-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{logger.name}</p>
                            <Badge variant="outline">{logger.pointType}</Badge>
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
                              className="interactive-tile rounded-md border bg-muted/25 px-2.5 py-2 hover:border-primary/30 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              href={href}
                              key={parameter.key}
                            >
                              {content}
                            </Link>
                          ) : (
                            <div
                              className="interactive-tile rounded-md border bg-muted/25 px-2.5 py-2"
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
                          value={logger.battery}
                        />
                        <TelemetryValue
                          icon={Signal}
                          label="Sinyal"
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
