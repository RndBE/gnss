import {
  Activity,
  AlertTriangle,
  BatteryCharging,
  Clock3,
  Gauge,
  MapPin,
  RadioTower,
  Satellite,
  Signal,
  TrendingDown,
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
import { generateAwlrInsights, generateGnssInsights } from "@/lib/insights";
import { InsightPanel } from "@/components/dashboard/insight-panel";
import type {
  AnalysisGranularity,
  AwlrMetric,
  AwlrMonitoringData,
  DataAnalysisMode,
  DeviceStatus,
  GnssAnomalySeverity,
  GnssMetric,
  GnssMonitoringData,
  GnssQualityStatus,
  GnssTrendStatus,
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

const qualityStatusClasses: Record<GnssQualityStatus, string> = {
  Valid:
    "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
  Suspect: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-50",
  Bad: "border-red-200 bg-red-50 text-red-700 hover:bg-red-50",
};

const trendStatusClasses: Record<GnssTrendStatus, string> = {
  Membaik:
    "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
  Stabil: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50",
  Memburuk: "border-red-200 bg-red-50 text-red-700 hover:bg-red-50",
};

const anomalySeverityClasses: Record<GnssAnomalySeverity, string> = {
  Info: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50",
  Warning: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-50",
  Critical: "border-red-200 bg-red-50 text-red-700 hover:bg-red-50",
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

function formatNullableNumber(value: number | null, suffix = "") {
  return value == null ? "-" : `${value.toFixed(1)}${suffix}`;
}

function granularityUnit(value: AnalysisGranularity) {
  return value === "daily" ? "hari" : "jam";
}

function MetricCard({ metric }: { metric: GnssMetric | AwlrMetric }) {
  return (
    <div className="interactive-card rounded-lg border bg-card px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{metric.label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{metric.value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{metric.detail}</p>
    </div>
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
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm">{mode === "gnss" ? "Logger GNSS" : "Logger AWLR"}</CardTitle>
            <CardDescription>{station.name}</CardDescription>
          </div>
          <StatusBadge status={station.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="interactive-tile rounded-lg border bg-muted/25 p-2.5">
          <div className="flex items-start gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background">
              <TypeIcon className="interactive-icon size-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{station.area}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" />
                {station.coordinate}
              </p>
            </div>
          </div>

          {"baselineElevation" in station ? (
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
              <div>
                <p className="text-muted-foreground">Baseline</p>
                <p className="mt-0.5 font-medium">{station.baselineElevation}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Elevasi kini</p>
                <p className="mt-0.5 font-medium">{station.currentElevation}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total turun</p>
                <p className="mt-0.5 font-medium">{station.totalSubsidence}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Update</p>
                <p className="mt-0.5 font-medium">{station.lastUpdate}</p>
              </div>
            </div>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
              <div>
                <p className="text-muted-foreground">Muka air</p>
                <p className="mt-0.5 font-medium">{station.currentLevel}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Jam rawan</p>
                <p className="mt-0.5 font-medium">{station.highTideWindow}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Interval</p>
                <p className="mt-0.5 font-medium">1 menit</p>
              </div>
              <div>
                <p className="text-muted-foreground">Update</p>
                <p className="mt-0.5 font-medium">{station.lastUpdate}</p>
              </div>
            </div>
          )}
        </div>

        {device ? (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{device.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
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
            <div className="space-y-2">
              <TelemetryValue
                icon={BatteryCharging}
                label="Baterai"
                value={device.battery}
              />
              <TelemetryValue icon={Signal} label="Sinyal" value={device.signal} />
            </div>
            <div className="grid gap-1 text-xs text-muted-foreground">
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

function GnssInsightCards({ data }: { data: GnssMonitoringData }) {
  const latestAnomaly = data.anomalies[0];

  return (
    <div className="grid gap-2 lg:grid-cols-3">
      <Card className="interactive-card">
        <CardContent className="flex flex-col gap-1.5 px-3 pb-3">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Gauge className="size-3.5" />
              Quality control
            </span>
            <Badge className={cn("border", qualityStatusClasses[data.quality.status])} variant="outline">
              {data.quality.status}
            </Badge>
          </div>
          <p className="text-xl font-semibold tabular-nums">{data.quality.score}/100</p>
          <Progress value={data.quality.score} />
          <p className="text-[11px] text-muted-foreground line-clamp-2">{data.quality.detail}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
            <span className="text-muted-foreground">PDOP <strong className="text-foreground">{formatNullableNumber(data.quality.pdop)}</strong></span>
            <span className="text-muted-foreground">Fix <strong className="text-foreground">{formatNullableNumber(data.quality.fixRatio, "%")}</strong></span>
            <span className="text-muted-foreground">Sat <strong className="text-foreground">{data.quality.satellites ?? "-"}</strong></span>
            <span className="text-muted-foreground">Gap <strong className="text-foreground">{formatNullableNumber(data.quality.dataGapHours, "h")}</strong></span>
          </div>
        </CardContent>
      </Card>

      <Card className="interactive-card">
        <CardContent className="flex flex-col gap-1.5 px-3 pb-3">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingDown className="size-3.5" />
              Regresi tren
            </span>
            <Badge className={cn("border", trendStatusClasses[data.trendAnalysis.status])} variant="outline">
              {data.trendAnalysis.status}
            </Badge>
          </div>
          <p className="text-xl font-semibold tabular-nums">
            {formatAxis(data.trendAnalysis.velocityCmYear, "cm/tahun")}
          </p>
          <p className="text-[11px] text-muted-foreground line-clamp-2">{data.trendAnalysis.detail}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
            <span className="text-muted-foreground">Keyakinan <strong className="text-foreground">{data.trendAnalysis.confidence}</strong></span>
            <span className="text-muted-foreground">Δ velocity <strong className="text-foreground">{formatAxis(data.trendAnalysis.velocityChangeCmYear, "cm/thn")}</strong></span>
          </div>
        </CardContent>
      </Card>

      <Card className="interactive-card">
        <CardContent className="flex flex-col gap-1.5 px-3 pb-3">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertTriangle className="size-3.5" />
              Lonjakan data
            </span>
            <Badge
              className={cn("border", latestAnomaly ? anomalySeverityClasses[latestAnomaly.severity] : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50")}
              variant="outline"
            >
              {latestAnomaly?.severity ?? "Clear"}
            </Badge>
          </div>
          <p className="text-xl font-semibold tabular-nums">{data.anomalies.length}</p>
          <p className="text-[11px] text-muted-foreground line-clamp-2">
            {latestAnomaly ? latestAnomaly.message : "Tidak ada lonjakan Z atau velocity pada rentang terpilih"}
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
            <span className="text-muted-foreground">Param <strong className="text-foreground">{latestAnomaly?.parameter ?? "-"}</strong></span>
            <span className="text-muted-foreground">Delta <strong className="text-foreground">{latestAnomaly?.delta ?? "-"}</strong></span>
            <span className="text-muted-foreground">Waktu <strong className="text-foreground">{latestAnomaly?.period ?? "-"}</strong></span>
            <span className="text-muted-foreground">Sampel <strong className="text-foreground">{data.analysis.sampleCount} {granularityUnit(data.selectedGranularity)}</strong></span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GnssObservations({ data }: { data: GnssMonitoringData }) {
  return (
    <Card className="interactive-card">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-sm">Observasi GNSS</CardTitle>
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

function GnssAnomalyPanel({ data }: { data: GnssMonitoringData }) {
  return (
    <Card className="interactive-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="interactive-icon size-4 text-muted-foreground" />
              Deteksi Lonjakan
            </CardTitle>
            <CardDescription>
              Validasi perubahan Z, velocity, dan kualitas data
            </CardDescription>
          </div>
          <Badge variant="outline">{data.anomalies.length} flag</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {data.anomalies.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Parameter</TableHead>
                <TableHead>Delta</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.anomalies.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.period}</TableCell>
                  <TableCell>{item.parameter}</TableCell>
                  <TableCell>{item.delta}</TableCell>
                  <TableCell>
                    <Badge
                      className={cn("border", anomalySeverityClasses[item.severity])}
                      variant="outline"
                    >
                      {item.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[360px] text-muted-foreground">
                    {item.message}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="px-6 py-8 text-sm text-muted-foreground">
            Tidak ada lonjakan data pada rentang terpilih.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AwlrObservations({ data }: { data: AwlrMonitoringData }) {
  return (
    <Card className="interactive-card">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-sm">Observasi AWLR</CardTitle>
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
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Perbandingan Pos</CardTitle>
        <CardDescription>Nilai terkini per lokasi GNSS</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 pb-3">
        {data.comparison.map((item) => (
          <div
            className={cn(
              "interactive-card rounded-lg border p-2.5",
              item.id === data.selectedStation.id && "bg-muted/35",
            )}
            key={item.id}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.area} · {item.lastUpdate}
                </p>
              </div>
              <StatusBadge status={item.status} />
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-xs">
              <MetricBox label="Z / Up" value={formatAxis(item.z)} />
              <MetricBox label="Velocity" value={formatAxis(item.velocity, "cm/tahun")} />
              <MetricBox label="Total turun" value={formatAxis(item.subsidence, "cm")} />
              <MetricBox label="QC score" value={`${item.qualityScore}/100`} />
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
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Perbandingan Pos</CardTitle>
        <CardDescription>Nilai terkini per lokasi AWLR</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 pb-3">
        {data.comparison.map((item) => (
          <div
            className={cn(
              "interactive-card rounded-lg border p-2.5",
              item.id === data.selectedStation.id && "bg-muted/35",
            )}
            key={item.id}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.area} · {item.lastUpdate}
                </p>
              </div>
              <StatusBadge status={item.status} />
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-xs">
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

function MetricBox({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("interactive-tile rounded-md bg-muted/45 px-2 py-1.5", className)}>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
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

    const awlrInsights = generateAwlrInsights(data);

    return (
      <AppShell
        activeArea={summary.activeArea}
        activePath="/analisa-data"
        title="Analisa Data"
        updatedAt={summary.updatedAt}
      >
        <div className="grid gap-3">
          <DataAnalysisFilterBar
            mode="awlr"
            stationOptions={data.stations}
            selectedStationId={data.selectedStation.id}
            selectedParameter={data.selectedParameter}
            selectedRange={data.selectedRange}
            selectedDateFrom={firstParam(params.from) ?? ""}
            selectedDateTo={firstParam(params.to) ?? ""}
            selectedGranularity={data.selectedGranularity}
            action={
              <InsightPanel
                insights={awlrInsights}
                stationName={data.selectedStation.name}
                mode="awlr"
              />
            }
          />
          <div className="grid gap-3 xl:grid-cols-[280px_minmax(0,1fr)]">
            <DeviceCard data={data} mode="awlr" />
            <div className="grid gap-3">
              <div
                className={cn(
                  "grid gap-2 grid-cols-2",
                  data.metrics.length > 1 && "sm:grid-cols-3 xl:grid-cols-4",
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
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
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

  const gnssInsights = generateGnssInsights(data);

  return (
    <AppShell
      activeArea={summary.activeArea}
      activePath="/analisa-data"
      title="Analisa Data"
      updatedAt={summary.updatedAt}
    >
      <div className="grid gap-3">
        <DataAnalysisFilterBar
          mode="gnss"
          stationOptions={data.stations}
          selectedStationId={data.selectedStation.id}
          selectedParameter={data.selectedParameter}
          selectedRange={data.selectedRange}
          selectedDateFrom={firstParam(params.from) ?? ""}
          selectedDateTo={firstParam(params.to) ?? ""}
          selectedGranularity={data.selectedGranularity}
          action={
            <InsightPanel
              insights={gnssInsights}
              stationName={data.selectedStation.name}
              mode="gnss"
            />
          }
        />
        <div className="grid gap-3 xl:grid-cols-[280px_minmax(0,1fr)]">
          <DeviceCard data={data} mode="gnss" />
          <div className="grid gap-3">
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 xl:grid-cols-4">
              {data.metrics.map((metric) => (
                <MetricCard key={metric.key} metric={metric} />
              ))}
            </div>
            <GnssInsightCards data={data} />
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
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="grid gap-3">
            <GnssObservations data={data} />
            <GnssAnomalyPanel data={data} />
          </div>
          <div className="grid gap-3">
            <GnssComparison data={data} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
