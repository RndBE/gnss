import {
  BatteryCharging,
  Clock3,
  MapPin,
  RadioTower,
  Satellite,
  Signal,
  Waves,
} from "lucide-react";

import { DataAnalysisChart } from "@/components/dashboard/data-analysis-chart";
import { DataAnalysisFilterBar } from "@/components/dashboard/data-analysis-filter-bar";
import { AppShell } from "@/components/dashboard/app-shell";
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
import {
  getAwlrMonitoringData,
  getDashboardSummary,
  getGnssMonitoringData,
} from "@/lib/backend/queries";
import type {
  AnalysisGranularity,
  AwlrMetric,
  AwlrMonitoringData,
  DataAnalysisMode,
  DeviceStatus,
  GnssMetric,
  GnssMonitoringData,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type AnalisaDataPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const deviceStatusClasses: Record<DeviceStatus, string> = {
  Online:
    "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
  Weak: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-50",
  Offline: "border-red-200 bg-red-50 text-red-700 hover:bg-red-50",
  Maintenance:
    "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50",
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeMode(value: string | string[] | undefined): DataAnalysisMode {
  return firstParam(value) === "awlr" ? "awlr" : "gnss";
}

function formatAxis(value: number, unit = "mm") {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)} ${unit}`;
}

function formatMetersValue(value: number) {
  return `${value.toFixed(2)} m`;
}

function granularityUnit(value: AnalysisGranularity) {
  return value === "daily" ? "hari" : "jam";
}

function MetricCard({ metric }: { metric: GnssMetric | AwlrMetric }) {
  return (
    <Card className="interactive-card gap-2 py-3">
      <CardHeader className="gap-1 px-4 pb-0">
        <CardDescription className="text-xs">{metric.label}</CardDescription>
        <CardTitle className="text-lg tabular-nums">{metric.value}</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <p className="text-xs text-muted-foreground">{metric.detail}</p>
      </CardContent>
    </Card>
  );
}

function TelemetryValue({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BatteryCharging;
  label: string;
  value: number;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Icon className="size-3" />
          {label}
        </span>
        <span className="font-medium tabular-nums">{value}%</span>
      </div>
      <Progress value={value} />
    </div>
  );
}

function DeviceCard({
  data,
  mode,
}: {
  data: GnssMonitoringData | AwlrMonitoringData;
  mode: DataAnalysisMode;
}) {
  const station = data.selectedStation;
  const device = station.device;
  const TypeIcon = mode === "gnss" ? RadioTower : Waves;

  return (
    <Card className="interactive-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{mode === "gnss" ? "Logger GNSS" : "Logger AWLR"}</CardTitle>
            <CardDescription>{station.name}</CardDescription>
          </div>
          <StatusBadge status={station.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="interactive-tile rounded-lg border bg-muted/25 p-3">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background">
              <TypeIcon className="interactive-icon size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{station.area}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" />
                {station.coordinate}
              </p>
            </div>
          </div>

          {"baselineElevation" in station ? (
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Baseline</p>
                <p className="mt-1 font-medium">{station.baselineElevation}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Elevasi kini</p>
                <p className="mt-1 font-medium">{station.currentElevation}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total turun</p>
                <p className="mt-1 font-medium">{station.totalSubsidence}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Update</p>
                <p className="mt-1 font-medium">{station.lastUpdate}</p>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Muka air</p>
                <p className="mt-1 font-medium">{station.currentLevel}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Jam rawan</p>
                <p className="mt-1 font-medium">{station.highTideWindow}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Interval</p>
                <p className="mt-1 font-medium">1 menit</p>
              </div>
              <div>
                <p className="text-muted-foreground">Update</p>
                <p className="mt-1 font-medium">{station.lastUpdate}</p>
              </div>
            </div>
          )}
        </div>

        {device ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{device.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Firmware {device.firmwareVersion}
                </p>
              </div>
              <Badge
                className={cn("border", deviceStatusClasses[device.status])}
                variant="outline"
              >
                {device.status}
              </Badge>
            </div>
            <div className="space-y-3">
              <TelemetryValue
                icon={BatteryCharging}
                label="Baterai"
                value={device.battery}
              />
              <TelemetryValue icon={Signal} label="Sinyal" value={device.signal} />
            </div>
            <div className="grid gap-2 text-xs text-muted-foreground">
              <p className="flex items-center gap-2">
                <Clock3 className="size-3.5" />
                Data terakhir {device.lastData}
              </p>
              <p className="flex items-center gap-2">
                <Satellite className="size-3.5" />
                Panel surya {device.solarCharging ? "charging" : "tidak charging"}
              </p>
            </div>
          </div>
        ) : (
            <div className="interactive-tile rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            Perangkat logger belum terhubung ke pos ini.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GnssObservations({ data }: { data: GnssMonitoringData }) {
  return (
    <Card className="interactive-card">
      <CardHeader>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Observasi GNSS</CardTitle>
            <CardDescription>
              {data.analysis.sampleCount} {granularityUnit(data.selectedGranularity)}
            </CardDescription>
          </div>
          <div className="text-sm text-muted-foreground">
            Delta terakhir {data.analysis.deltaFromPrevious} · Delta rentang{" "}
            {data.analysis.periodChange}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>X</TableHead>
              <TableHead>Y</TableHead>
              <TableHead>Z</TableHead>
              <TableHead>Velocity</TableHead>
              <TableHead>Elevasi</TableHead>
              <TableHead>PDOP</TableHead>
              <TableHead>Fix</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...data.trend].reverse().map((reading) => (
              <TableRow key={reading.recordedAt}>
                <TableCell className="font-medium">{reading.period}</TableCell>
                <TableCell>{formatAxis(reading.x)}</TableCell>
                <TableCell>{formatAxis(reading.y)}</TableCell>
                <TableCell>{formatAxis(reading.z)}</TableCell>
                <TableCell>{formatAxis(reading.velocity, "cm/tahun")}</TableCell>
                <TableCell>{reading.elevation.toFixed(2)} m</TableCell>
                <TableCell>{reading.pdop.toFixed(2)}</TableCell>
                <TableCell>{reading.fixRatio.toFixed(1)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function AwlrObservations({ data }: { data: AwlrMonitoringData }) {
  return (
    <Card className="interactive-card">
      <CardHeader>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Observasi AWLR</CardTitle>
            <CardDescription>
              {data.analysis.sampleCount} {granularityUnit(data.selectedGranularity)} muka air,{" "}
              {data.analysis.safeCount} normal
            </CardDescription>
          </div>
          <div className="text-sm text-muted-foreground">
            Delta terakhir {data.analysis.deltaFromPrevious} · Delta rentang{" "}
            {data.analysis.periodChange}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Muka air</TableHead>
              <TableHead>Margin Siaga</TableHead>
              <TableHead>Margin Awas</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...data.trend].reverse().map((reading) => (
              <TableRow key={reading.recordedAt}>
                <TableCell className="font-medium">{reading.period}</TableCell>
                <TableCell>{formatMetersValue(reading.waterLevel)}</TableCell>
                <TableCell>{formatMetersValue(reading.marginSiaga)}</TableCell>
                <TableCell>{formatMetersValue(reading.marginAwas)}</TableCell>
                <TableCell>
                  <StatusBadge status={reading.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function GnssComparison({ data }: { data: GnssMonitoringData }) {
  return (
    <Card className="interactive-card">
      <CardHeader>
        <CardTitle>Perbandingan Pos</CardTitle>
        <CardDescription>Nilai terkini per lokasi GNSS</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.comparison.map((item) => (
          <div
            className={cn(
              "interactive-card rounded-lg border p-3",
              item.id === data.selectedStation.id && "bg-muted/35",
            )}
            key={item.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{item.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.area} · update {item.lastUpdate}
                </p>
              </div>
              <StatusBadge status={item.status} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <MetricBox label="Z / Up" value={formatAxis(item.z)} />
              <MetricBox label="Velocity" value={formatAxis(item.velocity, "cm/tahun")} />
              <MetricBox label="X / Easting" value={formatAxis(item.x)} />
              <MetricBox label="Y / Northing" value={formatAxis(item.y)} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AwlrComparison({ data }: { data: AwlrMonitoringData }) {
  return (
    <Card className="interactive-card">
      <CardHeader>
        <CardTitle>Perbandingan Pos</CardTitle>
        <CardDescription>Nilai terkini per lokasi AWLR</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.comparison.map((item) => (
          <div
            className={cn(
              "interactive-card rounded-lg border p-3",
              item.id === data.selectedStation.id && "bg-muted/35",
            )}
            key={item.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{item.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.area} · update {item.lastUpdate}
                </p>
              </div>
              <StatusBadge status={item.status} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <MetricBox label="Muka air" value={formatMetersValue(item.waterLevel)} />
              <MetricBox label="Margin Awas" value={formatMetersValue(item.marginAwas)} />
              <MetricBox label="Ambang Siaga" value={formatMetersValue(item.siaga)} />
              <MetricBox label="Ambang Awas" value={formatMetersValue(item.awas)} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="interactive-tile rounded-md bg-muted/45 p-2">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export default async function AnalisaDataPage({ searchParams }: AnalisaDataPageProps) {
  const params = await searchParams;
  const mode = normalizeMode(params.sensor);

  if (mode === "awlr") {
    const [summary, data] = await Promise.all([
      getDashboardSummary(),
      getAwlrMonitoringData({
        stationId: firstParam(params.pos),
        parameter: firstParam(params.parameter),
        range: firstParam(params.range),
        dateFrom: firstParam(params.from),
        dateTo: firstParam(params.to),
        granularity: firstParam(params.granularity),
      }),
    ]);

    return (
      <AppShell
        activeArea={summary.activeArea}
        activePath="/analisa-data"
        title="Analisa Data"
        updatedAt={summary.updatedAt}
      >
        <div className="grid gap-4">
          <DataAnalysisFilterBar
            mode="awlr"
            stationOptions={data.stations}
            selectedStationId={data.selectedStation.id}
            selectedParameter={data.selectedParameter}
            selectedRange={data.selectedRange}
            selectedDateFrom={firstParam(params.from) ?? ""}
            selectedDateTo={firstParam(params.to) ?? ""}
            selectedGranularity={data.selectedGranularity}
          />
          <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
            <DeviceCard data={data} mode="awlr" />
            <div className="grid gap-4">
              <div
                className={cn(
                  "grid gap-4",
                  data.metrics.length > 1 && "sm:grid-cols-2 xl:grid-cols-3",
                )}
              >
                {data.metrics.map((metric) => (
                  <MetricCard key={metric.key} metric={metric} />
                ))}
              </div>
              <DataAnalysisChart
                data={data.trend}
                mode="awlr"
                parameter={data.selectedParameter}
                stationName={data.selectedStation.name}
                latestValue={data.analysis.latestValue}
                granularity={data.selectedGranularity}
                thresholds={data.thresholds}
              />
            </div>
          </div>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
            <AwlrObservations data={data} />
            <AwlrComparison data={data} />
          </div>
        </div>
      </AppShell>
    );
  }

  const [summary, data] = await Promise.all([
    getDashboardSummary(),
    getGnssMonitoringData({
      stationId: firstParam(params.pos),
      parameter: firstParam(params.parameter),
      range: firstParam(params.range),
      dateFrom: firstParam(params.from),
      dateTo: firstParam(params.to),
      granularity: firstParam(params.granularity),
    }),
  ]);

  return (
    <AppShell
      activeArea={summary.activeArea}
      activePath="/analisa-data"
      title="Analisa Data"
      updatedAt={summary.updatedAt}
    >
      <div className="grid gap-4">
        <DataAnalysisFilterBar
          mode="gnss"
          stationOptions={data.stations}
          selectedStationId={data.selectedStation.id}
          selectedParameter={data.selectedParameter}
          selectedRange={data.selectedRange}
          selectedDateFrom={firstParam(params.from) ?? ""}
          selectedDateTo={firstParam(params.to) ?? ""}
          selectedGranularity={data.selectedGranularity}
        />
        <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <DeviceCard data={data} mode="gnss" />
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.metrics.map((metric) => (
                <MetricCard key={metric.key} metric={metric} />
              ))}
            </div>
            <DataAnalysisChart
              data={data.trend}
              mode="gnss"
              parameter={data.selectedParameter}
              stationName={data.selectedStation.name}
              latestValue={data.analysis.latestValue}
              granularity={data.selectedGranularity}
              thresholds={data.thresholds}
            />
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <GnssObservations data={data} />
          <GnssComparison data={data} />
        </div>
      </div>
    </AppShell>
  );
}
