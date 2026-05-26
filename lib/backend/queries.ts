import { prisma } from "@/lib/prisma";
import {
  buildWaterLevelAlarmMessage,
  getWaterLevelRiskStatus,
} from "@/lib/backend/alarm-sync";
import type {
  AlarmEvent,
  AlarmThresholdPointOption,
  AlarmThresholdSetting,
  AnalysisGranularity,
  AwlrComparisonPoint,
  AwlrMetric,
  AwlrMonitoringData,
  AwlrParameter,
  AwlrStationMonitoring,
  AwlrThresholdProfile,
  AwlrTrendPoint,
  CctvSnapshot,
  DatabaseTableStat,
  DeviceManagementItem,
  DevicePointOption,
  DashboardSummary,
  DataLoggerFeed,
  DeviceTelemetry,
  GeneratedReport,
  GnssAnomaly,
  GnssComparisonPoint,
  GnssMetric,
  GnssMonitoringData,
  GnssParameter,
  GnssQualityStatus,
  GnssQualitySummary,
  GnssRange,
  GnssRegressionSummary,
  GnssStation,
  GnssStationMonitoring,
  GnssTrendPoint,
  MaintenanceLog,
  MonitoringPoint,
  ReportTemplate,
  RiskStatus,
  RiskArea,
  RiskWeightSetting,
  TideDatum,
  TideStation,
  TrendDatum,
  UserRole,
} from "@/lib/types";
import {
  formatClock,
  formatDateTime,
  formatDayDateTime,
  formatMeters,
  formatPeriod,
  formatSignedCm,
  toDeviceStatus,
  toEventState,
  toPointType,
  toRiskStatus,
} from "@/lib/backend/mappers";

const riskScoreByStatus = {
  Normal: 24,
  Waspada: 58,
  Siaga: 72,
  Awas: 86,
} as const;

const nextWindowByArea: Record<string, string> = {
  "Batang Roban": "19.30-21.30",
  "Kendal Kaliwungu": "20.30-22.30",
  "Pekalongan Utara": "21.00-23.00",
  "Semarang Utara": "20.00-22.00",
  Sayung: "22.00-00.00",
};

const gnssRangeDays: Record<GnssRange, number | null> = {
  "30d": 30,
  "90d": 90,
  "180d": 180,
  all: null,
  custom: null,
};

const gnssAxisFactors: Record<string, { x: number; y: number; satellites: number; pdop: number }> = {
  "gnss-btg-01": { x: -0.15, y: 0.08, satellites: 20, pdop: 1.28 },
  "gnss-kdl-01": { x: 0.11, y: -0.09, satellites: 18, pdop: 1.49 },
  "gnss-pkl-01": { x: -0.18, y: 0.11, satellites: 21, pdop: 1.18 },
  "gnss-smg-02": { x: 0.14, y: -0.16, satellites: 19, pdop: 1.34 },
  "gnss-dmk-03": { x: 0.09, y: 0.13, satellites: 16, pdop: 1.72 },
};

const gnssParameterLabels: Record<GnssParameter, { label: string; unit: string }> = {
  x: { label: "X / Easting", unit: "mm" },
  y: { label: "Y / Northing", unit: "mm" },
  z: { label: "Z / Up", unit: "mm" },
  velocity: { label: "Velocity vertikal", unit: "cm/tahun" },
  subsidence: { label: "Akumulasi turun", unit: "cm" },
  pdop: { label: "PDOP", unit: "" },
  fixRatio: { label: "Fix ratio", unit: "%" },
};

function toMonitoringPoint(point: Awaited<ReturnType<typeof getRawPoints>>[number]): MonitoringPoint {
  return {
    id: point.code,
    name: point.name,
    type: toPointType(point.type),
    lat: point.latitude,
    lon: point.longitude,
    area: point.area.name,
    status: toRiskStatus(point.status),
    value: point.latestValue ?? "-",
    lastUpdate: formatClock(point.lastUpdate),
  };
}

async function getRawPoints() {
  return prisma.monitoringPoint.findMany({
    include: { area: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
}

function buildTrendData(readings: Awaited<ReturnType<typeof getRawGnssReadings>>): TrendDatum[] {
  const rows = new Map<string, TrendDatum>();

  for (const reading of readings) {
    const period = formatPeriod(reading.recordedAt);
    const row =
      rows.get(period) ??
      ({
        period,
        gnssPkl01: 0,
        gnssSmg02: 0,
        gnssDmk03: 0,
      } satisfies TrendDatum);

    if (reading.point.code === "gnss-pkl-01") {
      row.gnssPkl01 = reading.velocityCmYear;
    }
    if (reading.point.code === "gnss-smg-02") {
      row.gnssSmg02 = reading.velocityCmYear;
    }
    if (reading.point.code === "gnss-dmk-03") {
      row.gnssDmk03 = reading.velocityCmYear;
    }

    rows.set(period, row);
  }

  return Array.from(rows.values());
}

function buildTideData(readings: Awaited<ReturnType<typeof getRawWaterReadings>>): TideDatum[] {
  return readings.map((reading) => ({
    hour: formatClock(reading.recordedAt),
    waterLevel: reading.waterLevelM,
    waspada: reading.waspadaM,
    siaga: reading.siagaM,
  }));
}

async function getRawGnssReadings() {
  return prisma.gnssReading.findMany({
    include: { point: true },
    orderBy: { recordedAt: "asc" },
  });
}

async function getRawWaterReadings() {
  const primaryAwlr = await prisma.monitoringPoint.findFirst({
    where: { type: "AWLR" },
    orderBy: { code: "asc" },
  });

  return prisma.waterLevelReading.findMany({
    where: primaryAwlr ? { pointId: primaryAwlr.id } : undefined,
    include: { point: true },
    orderBy: { recordedAt: "asc" },
  });
}

async function getRawLatestAwlrStations() {
  return prisma.monitoringPoint.findMany({
    where: { type: "AWLR" },
    include: {
      area: true,
      waterReadings: {
        orderBy: { recordedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { code: "asc" },
  });
}

async function getRawDevices() {
  return prisma.device.findMany({
    include: { point: { include: { area: true } } },
    orderBy: { name: "asc" },
  });
}

async function getRawAlarms() {
  return prisma.alarm.findMany({
    include: {
      area: true,
      point: {
        include: {
          waterReadings: {
            orderBy: { recordedAt: "desc" },
            take: 1,
          },
          alarmThresholds: {
            where: { parameter: "waterLevel" },
            take: 1,
          },
        },
      },
    },
    orderBy: { occurredAt: "desc" },
  });
}

async function getRawSnapshots() {
  return prisma.cameraSnapshot.findMany({
    include: { point: { include: { area: true } } },
    orderBy: { capturedAt: "desc" },
  });
}

export async function getMonitoringPoints(): Promise<MonitoringPoint[]> {
  const points = await getRawPoints();
  return points.map(toMonitoringPoint);
}

export async function getDeviceTelemetry(): Promise<DeviceTelemetry[]> {
  const devices = await getRawDevices();

  return devices.map((device) => ({
    id: device.code,
    name: device.name,
    type:
      device.type === "LOGGER"
        ? "LOGGER"
        : device.type === "AWLR"
          ? "AWLR"
          : device.type === "CCTV"
            ? "CCTV"
            : "GNSS",
    status: toDeviceStatus(device.status),
    battery: device.battery,
    signal: device.signal,
    lastData: formatClock(device.lastDataReceived),
  }));
}

function toDeviceManagementType(type: string): DeviceManagementItem["type"] {
  if (type === "LOGGER") return "LOGGER";
  if (type === "AWLR") return "AWLR";
  if (type === "CCTV") return "CCTV";
  if (type === "WEATHER") return "WEATHER";
  return "GNSS";
}

function toPointOptionType(type: string): DevicePointOption["type"] {
  if (type === "AWLR") return "AWLR";
  if (type === "CCTV") return "CCTV";
  if (type === "WEATHER") return "WEATHER";
  return "GNSS";
}

export async function getDeviceManagementItems(): Promise<DeviceManagementItem[]> {
  const devices = await getRawDevices();
  const areaIds = Array.from(
    new Set(
      devices
        .map((device) => device.point?.areaId)
        .filter((areaId): areaId is string => Boolean(areaId)),
    ),
  );
  const weatherReadings =
    areaIds.length > 0
      ? await prisma.weatherReading.findMany({
          where: {
            point: {
              areaId: {
                in: areaIds,
              },
            },
          },
          include: {
            point: true,
          },
          orderBy: {
            recordedAt: "desc",
          },
        })
      : [];
  const latestWeatherByArea = new Map<
    string,
    (typeof weatherReadings)[number]
  >();

  for (const reading of weatherReadings) {
    if (!latestWeatherByArea.has(reading.point.areaId)) {
      latestWeatherByArea.set(reading.point.areaId, reading);
    }
  }

  return devices.map((device) => {
    const weather = device.point
      ? latestWeatherByArea.get(device.point.areaId)
      : null;

    return {
      id: device.id,
      code: device.code,
      name: device.name,
      type: toDeviceManagementType(device.type),
      status: toDeviceStatus(device.status),
      battery: device.battery,
      signal: device.signal,
      temperatureC: weather?.temperatureC ?? null,
      humidityPct: weather?.humidityPct ?? null,
      solarCharging: device.solarCharging,
      firmwareVersion: device.firmwareVersion ?? "",
      sensorStatus: device.sensorStatus ?? "",
      lastDataReceived: formatDateTimeInput(device.lastDataReceived),
      lastDataLabel: formatDayDateTime(device.lastDataReceived),
      pointId: device.point?.id ?? "",
      pointName: device.point?.name ?? "Belum terhubung",
      pointType: device.point ? toPointOptionType(device.point.type) : "GNSS",
      area: device.point?.area.name ?? "-",
    };
  });
}

export async function getDevicePointOptions(): Promise<DevicePointOption[]> {
  const points = await prisma.monitoringPoint.findMany({
    include: { area: true },
    orderBy: [{ type: "asc" }, { code: "asc" }],
  });

  return points.map((point) => ({
    id: point.id,
    code: point.code,
    name: point.name,
    type: toPointOptionType(point.type),
    area: point.area.name,
  }));
}

export async function getDataLoggerFeeds(): Promise<DataLoggerFeed[]> {
  const points = await prisma.monitoringPoint.findMany({
    where: { type: { in: ["GNSS", "AWLR"] } },
    include: {
      area: true,
      devices: {
        orderBy: { name: "asc" },
      },
      gnssReadings: {
        orderBy: { recordedAt: "desc" },
        take: 1,
      },
      waterReadings: {
        orderBy: { recordedAt: "desc" },
        take: 1,
      },
    },
    orderBy: [{ type: "asc" }, { code: "asc" }],
  });

  return points.map((point) => {
    const device =
      point.devices.find((item) => item.type === "LOGGER" || item.type === point.type) ??
      point.devices[0] ??
      null;
    const latestGnss = point.gnssReadings[0];
    const latestWater = point.waterReadings[0];
    const latestVector =
      point.type === "GNSS" && latestGnss
        ? toGnssTrendPoint(latestGnss, point.code, 0)
        : null;
    const lastDataAt =
      device?.lastDataReceived ??
      latestGnss?.recordedAt ??
      latestWater?.recordedAt ??
      point.lastUpdate;
    const parameters =
      point.type === "GNSS"
        ? [
            {
              key: "x",
              label: "X",
              value: formatSignedValue(latestVector?.x, "mm"),
            },
            {
              key: "y",
              label: "Y",
              value: formatSignedValue(latestVector?.y, "mm"),
            },
            {
              key: "z",
              label: "Z",
              value: formatSignedValue(latestVector?.z, "mm"),
            },
            {
              key: "velocity",
              label: "Velocity",
              value: formatSignedValue(latestVector?.velocity, "cm/tahun"),
            },
            {
              key: "pdop",
              label: "PDOP",
              value: latestVector ? latestVector.pdop.toFixed(2) : "-",
            },
            {
              key: "fixRatio",
              label: "Fix",
              value: latestVector ? `${latestVector.fixRatio.toFixed(1)}%` : "-",
            },
          ]
        : [
            {
              key: "waterLevel",
              label: "Muka air",
              value: formatMeters(latestWater?.waterLevelM),
            },
          ];

    return {
      id: device?.code ?? point.code,
      name: device?.name ?? `Logger ${point.name}`,
      pointId: point.code,
      pointName: point.name,
      pointType: point.type === "AWLR" ? "AWLR" : "GNSS",
      area: point.area.name,
      coordinate: `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`,
      intervalLabel: "1 menit",
      status: device ? toDeviceStatus(device.status) : "Online",
      pointStatus: toRiskStatus(point.status),
      battery: device?.battery ?? null,
      signal: device?.signal ?? null,
      firmwareVersion: device?.firmwareVersion ?? "-",
      lastData: formatDayDateTime(lastDataAt),
      parameters,
    };
  });
}

export async function getAlarmEvents(): Promise<AlarmEvent[]> {
  const alarms = await getRawAlarms();

  return alarms.map((alarm) => {
    const point = alarm.point;
    const latestWater = point?.waterReadings[0];
    const threshold = point?.alarmThresholds[0];
    let status = toRiskStatus(alarm.status);
    let message = alarm.message;

    if (alarm.type === "Water Level Alert" && point?.type === "AWLR" && latestWater) {
      const thresholds = {
        waspada: threshold?.waspada ?? latestWater.waspadaM,
        siaga: threshold?.siaga ?? latestWater.siagaM,
        awas: threshold?.awas ?? latestWater.awasM,
      };

      status = getWaterLevelRiskStatus(latestWater.waterLevelM, thresholds);
      message = buildWaterLevelAlarmMessage(latestWater.waterLevelM, status, thresholds);
      if (alarm.state === "OPEN" && status !== "Normal") {
        message = `Menunggu validasi operator. ${message}`;
      }
    }

    return {
      id: alarm.code,
      type: alarm.type,
      area: alarm.area.name,
      status,
      state: toEventState(alarm.state),
      time: formatClock(alarm.occurredAt),
      message,
      requiresValidation: alarm.state === "OPEN",
    };
  });
}

export async function getCctvSnapshots(): Promise<CctvSnapshot[]> {
  const snapshots = await getRawSnapshots();

  return snapshots.map((snapshot) => ({
    id: snapshot.id,
    name: snapshot.point.name,
    area: snapshot.point.area.name,
    status: toRiskStatus(snapshot.status),
    capturedAt: formatDayDateTime(snapshot.capturedAt),
    imageUrl: snapshot.imageUrl,
    note: snapshot.note,
    visibility:
      snapshot.visibility === "Rain"
        ? "Rain"
        : snapshot.visibility === "Low light"
          ? "Low light"
          : "Clear",
  }));
}

export async function getRiskAreas(): Promise<RiskArea[]> {
  const areas = await prisma.monitoringArea.findMany({
    include: {
      points: {
        include: {
          waterReadings: {
            orderBy: { recordedAt: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return areas.map((area) => {
    const statuses = area.points.map((point) => toRiskStatus(point.status));
    const status =
      statuses.find((item) => item === "Awas") ??
      statuses.find((item) => item === "Siaga") ??
      statuses.find((item) => item === "Waspada") ??
      "Normal";
    const gnss = area.points
      .filter((point) => point.type === "GNSS")
      .sort((a, b) => (a.velocityCmYear ?? 0) - (b.velocityCmYear ?? 0))[0];
    const water = area.points
      .flatMap((point) => point.waterReadings)
      .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())[0];

    return {
      area: area.name,
      status,
      score: riskScoreByStatus[status],
      subsidenceRate: formatSignedCm(gnss?.velocityCmYear),
      waterLevel: formatMeters(water?.waterLevelM),
      nextWindow: nextWindowByArea[area.name] ?? "Belum dihitung",
    };
  });
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [
    points,
    devices,
    alarms,
    snapshots,
    riskAreas,
    gnssReadings,
    waterReadings,
    dataLoggers,
    awlrStations,
  ] = await Promise.all([
    getMonitoringPoints(),
    getDeviceTelemetry(),
    getAlarmEvents(),
    getCctvSnapshots(),
    getRiskAreas(),
    getRawGnssReadings(),
    getRawWaterReadings(),
    getDataLoggerFeeds(),
    getRawLatestAwlrStations(),
  ]);

  const latestGnssByPoint = Array.from(
    gnssReadings
      .reduce((rows, reading) => {
        const current = rows.get(reading.point.code);
        if (!current || reading.recordedAt > current.recordedAt) {
          rows.set(reading.point.code, reading);
        }
        return rows;
      }, new Map<string, (typeof gnssReadings)[number]>())
      .values(),
  );
  const latestWaterByStation = awlrStations
    .map((station) => ({
      station,
      reading: station.waterReadings[0],
    }))
    .filter((item): item is typeof item & { reading: NonNullable<typeof item.reading> } =>
      Boolean(item.reading),
    );
  const latestWater = latestWaterByStation
    .sort((a, b) => b.reading.waterLevelM - a.reading.waterLevelM)[0];
  const openAlarmCount = alarms.filter(
    (alarm) => alarm.state === "Open" || alarm.state === "In Progress",
  ).length;
  const activeLoggerCount = dataLoggers.filter(
    (logger) => logger.status === "Online" || logger.status === "Weak",
  ).length;
  const maxSubsidenceReading = latestGnssByPoint
    .slice()
    .sort((a, b) => a.velocityCmYear - b.velocityCmYear)[0];
  const maxSubsidence = maxSubsidenceReading?.velocityCmYear ?? 0;
  const averageSubsidence =
    latestGnssByPoint.length > 0
      ? latestGnssByPoint.reduce((total, reading) => total + reading.velocityCmYear, 0) /
        latestGnssByPoint.length
      : 0;
  const topRisk =
    riskAreas.find((area) => area.status === "Awas") ??
    riskAreas.find((area) => area.status === "Siaga") ??
    riskAreas.find((area) => area.status === "Waspada") ??
    riskAreas[0];

  return {
    updatedAt: formatDateTime(new Date()),
    activeArea: "Pantura Jawa Tengah",
    kpis: {
      maxSubsidence: formatSignedCm(maxSubsidence),
      averageSubsidence: formatSignedCm(averageSubsidence),
      waterLevel: formatMeters(latestWater?.reading.waterLevelM),
      floodRisk: topRisk?.status ?? "Normal",
      activePoints: `${activeLoggerCount}/${dataLoggers.length}`,
      activeAlarms: openAlarmCount,
      maxSubsidenceStation: maxSubsidenceReading?.point.name ?? "Belum ada GNSS",
      waterLevelStation: latestWater?.station.name ?? "Belum ada AWLR",
      activeLoggerDetail: `${activeLoggerCount} dari ${dataLoggers.length} logger GNSS/AWLR aktif`,
    },
    monitoringPoints: points,
    trend: buildTrendData(gnssReadings),
    tide: buildTideData(waterReadings),
    riskAreas,
    alarms,
    devices,
    dataLoggers,
    cctvSnapshots: snapshots,
  };
}

export async function getGnssStations(): Promise<GnssStation[]> {
  const stations = await prisma.monitoringPoint.findMany({
    where: { type: "GNSS" },
    orderBy: { code: "asc" },
  });

  return stations.map((station) => ({
    id: station.code,
    name: station.name,
    coordinate: `${station.latitude.toFixed(3)}, ${station.longitude.toFixed(3)}`,
    baselineElevation: formatMeters(station.baselineElevationM),
    currentElevation: formatMeters(station.currentElevationM),
    totalSubsidence:
      station.totalSubsidenceCm == null
        ? "-"
        : `${station.totalSubsidenceCm.toFixed(0)} cm`,
    velocity: formatSignedCm(station.velocityCmYear),
    status: toRiskStatus(station.status),
    lastUpdate: formatClock(station.lastUpdate),
  }));
}

function normalizeGnssParameter(value: string | null | undefined): GnssParameter {
  if (
    value === "x" ||
    value === "y" ||
    value === "z" ||
    value === "velocity" ||
    value === "subsidence" ||
    value === "pdop" ||
    value === "fixRatio"
  ) {
    return value;
  }
  return "z";
}

function normalizeGnssRange(value: string | null | undefined): GnssRange {
  if (
    value === "30d" ||
    value === "90d" ||
    value === "180d" ||
    value === "all" ||
    value === "custom"
  ) {
    return value;
  }
  return "180d";
}

function normalizeAnalysisGranularity(
  value: string | null | undefined,
): AnalysisGranularity {
  return value === "daily" ? "daily" : "hourly";
}

function parseDateBoundary(
  value: string | null | undefined,
  boundary: "start" | "end",
) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const suffix = boundary === "start" ? "00:00:00.000" : "23:59:59.999";
  const date = new Date(`${value}T${suffix}+07:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function filterTrendByRange<T extends { recordedAt: string }>(
  rows: T[],
  range: GnssRange,
  last: T | null,
  dateFrom?: string | null,
  dateTo?: string | null,
) {
  if (range === "custom") {
    let start = parseDateBoundary(dateFrom, "start");
    let end = parseDateBoundary(dateTo, "end");

    if (start && end && start > end) {
      [start, end] = [end, start];
    }

    if (!start && !end) return rows;

    return rows.filter((row) => {
      const recordedAt = new Date(row.recordedAt);

      if (start && recordedAt < start) return false;
      if (end && recordedAt > end) return false;
      return true;
    });
  }

  const rangeDays = gnssRangeDays[range];
  const rangeStart =
    rangeDays && last
      ? new Date(new Date(last.recordedAt).getTime() - rangeDays * 24 * 60 * 60 * 1000)
      : null;

  return rangeStart
    ? rows.filter((point) => new Date(point.recordedAt) >= rangeStart)
    : rows;
}

function hasCustomDateRangeFilter(
  range: GnssRange,
  dateFrom?: string | null,
  dateTo?: string | null,
) {
  return (
    range === "custom" &&
    Boolean(parseDateBoundary(dateFrom, "start") || parseDateBoundary(dateTo, "end"))
  );
}

function formatGnssPeriod(date: Date) {
  const parts = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("day")} ${get("month")} ${get("hour")}.${get("minute")}`;
}

function formatDateTimeInput(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Jakarta",
    year: "numeric",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function getJakartaBucketParts(date: Date) {
  const parts = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    month: "2-digit",
    timeZone: "Asia/Jakarta",
    year: "numeric",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    day: get("day"),
    hour: get("hour"),
    month: get("month"),
    year: get("year"),
  };
}

function getAnalysisBucketKey(date: Date, granularity: AnalysisGranularity) {
  const parts = getJakartaBucketParts(date);
  const dateKey = `${parts.year}-${parts.month}-${parts.day}`;

  return granularity === "daily" ? dateKey : `${dateKey}-${parts.hour}`;
}

function formatAnalysisBucketPeriod(
  date: Date,
  granularity: AnalysisGranularity,
) {
  const parts = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    month: "short",
    timeZone: "Asia/Jakarta",
    year: granularity === "daily" ? "numeric" : undefined,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const dayMonth = `${get("day")} ${get("month")}`;

  return granularity === "daily"
    ? `${dayMonth} ${get("year")}`.trim()
    : `${dayMonth} ${get("hour")}.00`;
}

function round(value: number, digits = 1) {
  return Number(value.toFixed(digits));
}

function formatSignedValue(value: number | null | undefined, unit: string, digits = 1) {
  if (value == null || Number.isNaN(value)) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)} ${unit}`;
}

function formatGnssParameterValue(
  parameter: GnssParameter,
  value: number | null | undefined,
) {
  if (value == null || Number.isNaN(value)) return "-";
  if (parameter === "pdop") return value.toFixed(2);
  if (parameter === "fixRatio") return `${value.toFixed(1)}%`;
  return formatSignedValue(value, gnssParameterLabels[parameter].unit);
}

function formatGnssParameterDelta(
  parameter: GnssParameter,
  value: number | null | undefined,
) {
  if (value == null || Number.isNaN(value)) return "-";
  if (parameter === "pdop") return formatSignedValue(value, "", 2).trim();
  return formatSignedValue(value, gnssParameterLabels[parameter].unit);
}

function getTrendValue(point: GnssTrendPoint | null | undefined, parameter: GnssParameter) {
  return point ? point[parameter] : null;
}

async function getRawGnssStationsForMonitoring() {
  return prisma.monitoringPoint.findMany({
    where: { type: "GNSS" },
    include: {
      area: true,
      devices: {
        orderBy: { name: "asc" },
      },
      gnssReadings: {
        orderBy: { recordedAt: "asc" },
      },
      alarmThresholds: {
        where: { parameter: "velocity" },
        take: 1,
      },
    },
    orderBy: { code: "asc" },
  });
}

function extractSensorNumeric(
  payload: unknown,
  label: string,
): number | null {
  if (!payload || typeof payload !== "object") return null;
  for (const value of Object.values(payload as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const entry = value as { nama?: unknown; nilai?: unknown };
    if (entry.nama !== label) continue;
    const n =
      typeof entry.nilai === "number"
        ? entry.nilai
        : typeof entry.nilai === "string"
          ? Number(entry.nilai)
          : NaN;
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

async function buildLoggerGnssTrend(
  deviceCode: string,
  baselineLat: number | null,
  baselineLon: number | null,
  baselineAlt: number | null,
): Promise<GnssTrendPoint[]> {
  const readings = await prisma.loggerReading.findMany({
    where: { deviceCode },
    orderBy: { recordedAt: "asc" },
  });
  if (readings.length === 0) return [];

  return readings.map((reading) => {
    const lat = extractSensorNumeric(reading.payload, "Latitude");
    const lon = extractSensorNumeric(reading.payload, "Longitude");
    const alt = extractSensorNumeric(reading.payload, "Altitude");
    const satellites = extractSensorNumeric(reading.payload, "Satellites") ?? 0;
    const hdop = extractSensorNumeric(reading.payload, "HDOP") ?? 0;

    const dY =
      baselineLat != null && lat != null
        ? (lat - baselineLat) * METERS_PER_DEG_LAT * 1000
        : 0;
    const dX =
      baselineLon != null && lon != null
        ? (lon - baselineLon) *
          METERS_PER_DEG_LAT *
          Math.cos(((baselineLat ?? lat ?? 0) * Math.PI) / 180) *
          1000
        : 0;
    const dZmm =
      baselineAlt != null && alt != null ? (alt - baselineAlt) * 1000 : 0;
    const dZcm = dZmm / 10;

    return {
      period: formatGnssPeriod(reading.recordedAt),
      recordedAt: reading.recordedAt.toISOString(),
      x: round(dX),
      y: round(dY),
      z: round(dZmm),
      velocity: 0,
      elevation: alt != null ? round(alt, 2) : 0,
      subsidence: round(dZcm, 2),
      satellites: Math.round(satellites),
      pdop: round(hdop, 2),
      fixRatio: 100,
    };
  });
}

type RawGnssMonitoringStation = Awaited<
  ReturnType<typeof getRawGnssStationsForMonitoring>
>[number];

function getGnssVelocityThresholdProfile(
  station: RawGnssMonitoringStation,
): AwlrThresholdProfile {
  const threshold = station.alarmThresholds[0];

  return {
    normal: threshold?.normal ?? 2,
    waspada: threshold?.waspada ?? 4,
    siaga: threshold?.siaga ?? 7,
    awas: threshold?.awas ?? 8,
    unit: threshold?.unit ?? "cm/tahun",
  };
}

function toGnssTrendPoint(
  reading: RawGnssMonitoringStation["gnssReadings"][number],
  stationCode: string,
  index: number,
): GnssTrendPoint {
  const factors =
    gnssAxisFactors[stationCode] ?? {
      x: 0.1,
      y: 0.1,
      satellites: 17,
      pdop: 1.5,
    };
  const verticalMm = reading.subsidenceCm * 10;
  const horizontalMagnitude = Math.abs(verticalMm);
  const fixRatio = 99.1 - index * 0.12;

  return {
    period: formatGnssPeriod(reading.recordedAt),
    recordedAt: reading.recordedAt.toISOString(),
    x: round(horizontalMagnitude * factors.x),
    y: round(horizontalMagnitude * factors.y),
    z: round(verticalMm),
    velocity: round(reading.velocityCmYear),
    elevation: round(reading.elevationM, 2),
    subsidence: round(reading.subsidenceCm),
    satellites: factors.satellites,
    pdop: round(factors.pdop + index * 0.03, 2),
    fixRatio: round(Math.max(55, fixRatio), 1),
  };
}

function aggregateGnssTrendByGranularity(
  rows: GnssTrendPoint[],
  granularity: AnalysisGranularity,
): GnssTrendPoint[] {
  type Bucket = Omit<GnssTrendPoint, "period" | "recordedAt"> & {
    count: number;
    period: string;
    recordedAt: string;
  };
  const buckets = new Map<string, Bucket>();

  for (const row of rows) {
    const recordedAt = new Date(row.recordedAt);
    const key = getAnalysisBucketKey(recordedAt, granularity);
    const bucket =
      buckets.get(key) ??
      ({
        count: 0,
        period: formatAnalysisBucketPeriod(recordedAt, granularity),
        recordedAt: row.recordedAt,
        x: 0,
        y: 0,
        z: 0,
        velocity: 0,
        elevation: 0,
        subsidence: 0,
        satellites: 0,
        pdop: 0,
        fixRatio: 0,
      } satisfies Bucket);

    bucket.count += 1;
    bucket.recordedAt = row.recordedAt;
    bucket.x += row.x;
    bucket.y += row.y;
    bucket.z += row.z;
    bucket.velocity += row.velocity;
    bucket.elevation += row.elevation;
    bucket.subsidence += row.subsidence;
    bucket.satellites += row.satellites;
    bucket.pdop += row.pdop;
    bucket.fixRatio += row.fixRatio;
    buckets.set(key, bucket);
  }

  return Array.from(buckets.values()).map((bucket) => ({
    period: bucket.period,
    recordedAt: bucket.recordedAt,
    x: round(bucket.x / bucket.count),
    y: round(bucket.y / bucket.count),
    z: round(bucket.z / bucket.count),
    velocity: round(bucket.velocity / bucket.count),
    elevation: round(bucket.elevation / bucket.count, 2),
    subsidence: round(bucket.subsidence / bucket.count),
    satellites: Math.round(bucket.satellites / bucket.count),
    pdop: round(bucket.pdop / bucket.count, 2),
    fixRatio: round(bucket.fixRatio / bucket.count, 1),
  }));
}

function toGnssMonitoringStation(station: RawGnssMonitoringStation): GnssStationMonitoring {
  const device =
    station.devices.find((item) => item.type === "GNSS" || item.type === "LOGGER") ??
    station.devices[0] ??
    null;

  return {
    id: station.code,
    name: station.name,
    area: station.area.name,
    coordinate: `${station.latitude.toFixed(5)}, ${station.longitude.toFixed(5)}`,
    latitude: station.latitude,
    longitude: station.longitude,
    baselineElevation: formatMeters(station.baselineElevationM),
    currentElevation: formatMeters(station.currentElevationM),
    totalSubsidence:
      station.totalSubsidenceCm == null
        ? "-"
        : `${station.totalSubsidenceCm.toFixed(0)} cm`,
    velocity: formatSignedCm(station.velocityCmYear),
    status: toRiskStatus(station.status),
    lastUpdate: formatClock(station.lastUpdate),
    device: device
      ? {
          id: device.code,
          name: device.name,
          status: toDeviceStatus(device.status),
          battery: device.battery,
          signal: device.signal,
          solarCharging: device.solarCharging,
          firmwareVersion: device.firmwareVersion ?? "-",
          lastData: formatClock(device.lastDataReceived),
        }
      : null,
  };
}

function getQualityStatus(score: number): GnssQualityStatus {
  if (score >= 80) return "Valid";
  if (score >= 60) return "Suspect";
  return "Bad";
}

function getLatestGapHours(latest: GnssTrendPoint | null) {
  if (!latest) return null;

  const recordedAt = new Date(latest.recordedAt).getTime();
  if (Number.isNaN(recordedAt)) return null;

  return round(Math.max(0, Date.now() - recordedAt) / (1000 * 60 * 60), 1);
}

function buildGnssQualitySummary(
  latest: GnssTrendPoint | null,
  device: GnssStationMonitoring["device"],
): GnssQualitySummary {
  const reasons: string[] = [];
  let penalty = latest ? 0 : 45;
  const gapHours = getLatestGapHours(latest);

  if (!latest) {
    reasons.push("belum ada observasi GNSS");
  } else {
    if (latest.pdop > 3) {
      penalty += 25;
      reasons.push("PDOP tinggi");
    } else if (latest.pdop > 2) {
      penalty += 12;
      reasons.push("PDOP mulai naik");
    }

    if (latest.fixRatio < 85) {
      penalty += 30;
      reasons.push("fix ratio rendah");
    } else if (latest.fixRatio < 95) {
      penalty += 15;
      reasons.push("fix ratio menurun");
    }

    if (latest.satellites < 10) {
      penalty += 25;
      reasons.push("satelit terlacak minim");
    } else if (latest.satellites < 15) {
      penalty += 12;
      reasons.push("jumlah satelit terbatas");
    }
  }

  if (device) {
    if (device.signal < 40) {
      penalty += 20;
      reasons.push("sinyal telemetry lemah");
    } else if (device.signal < 60) {
      penalty += 10;
      reasons.push("sinyal telemetry sedang");
    }

    if (device.battery < 20) {
      penalty += 20;
      reasons.push("baterai kritis");
    } else if (device.battery < 40) {
      penalty += 10;
      reasons.push("baterai rendah");
    }
  } else {
    penalty += 15;
    reasons.push("logger belum terhubung");
  }

  if (gapHours != null) {
    if (gapHours > 72) {
      penalty += 30;
      reasons.push("data terakhir lebih dari 72 jam");
    } else if (gapHours > 24) {
      penalty += 15;
      reasons.push("data terakhir lebih dari 24 jam");
    }
  }

  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));
  const status = getQualityStatus(score);

  return {
    score,
    status,
    label:
      status === "Valid"
        ? "Data layak analisis"
        : status === "Suspect"
          ? "Perlu validasi"
          : "Jangan dipakai tanpa cek lapangan",
    detail:
      reasons.length > 0
        ? reasons.slice(0, 3).join(", ")
        : "PDOP, fix ratio, satelit, dan telemetry dalam batas operasi",
    pdop: latest?.pdop ?? null,
    fixRatio: latest?.fixRatio ?? null,
    satellites: latest?.satellites ?? null,
    signal: device?.signal ?? null,
    battery: device?.battery ?? null,
    dataGapHours: gapHours,
  };
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function buildGnssRegressionSummary(rows: GnssTrendPoint[]): GnssRegressionSummary {
  if (rows.length < 2) {
    return {
      status: "Stabil",
      slopeMmPerDay: 0,
      velocityCmYear: 0,
      velocityChangeCmYear: 0,
      rSquared: 0,
      confidence: "Rendah",
      detail: "Data belum cukup untuk regresi tren",
    };
  }

  const start = new Date(rows[0].recordedAt).getTime();
  const points = rows.map((row) => ({
    x: (new Date(row.recordedAt).getTime() - start) / (1000 * 60 * 60 * 24),
    y: row.z,
  }));
  const meanX = average(points.map((point) => point.x));
  const meanY = average(points.map((point) => point.y));
  const denominator = points.reduce(
    (total, point) => total + (point.x - meanX) ** 2,
    0,
  );
  const slope =
    denominator === 0
      ? 0
      : points.reduce(
          (total, point) => total + (point.x - meanX) * (point.y - meanY),
          0,
        ) / denominator;
  const intercept = meanY - slope * meanX;
  const residual = points.reduce(
    (total, point) => total + (point.y - (slope * point.x + intercept)) ** 2,
    0,
  );
  const totalVariance = points.reduce(
    (total, point) => total + (point.y - meanY) ** 2,
    0,
  );
  const rSquared =
    totalVariance === 0 ? 1 : Math.max(0, Math.min(1, 1 - residual / totalVariance));
  const midpoint = Math.max(1, Math.floor(rows.length / 2));
  const firstVelocity = average(rows.slice(0, midpoint).map((row) => row.velocity));
  const secondVelocity = average(rows.slice(midpoint).map((row) => row.velocity));
  const velocityChange = secondVelocity - firstVelocity;
  const status: GnssRegressionSummary["status"] =
    velocityChange <= -0.5
      ? "Memburuk"
      : velocityChange >= 0.5
        ? "Membaik"
        : "Stabil";
  const confidence: GnssRegressionSummary["confidence"] =
    rows.length >= 12 && rSquared >= 0.75
      ? "Tinggi"
      : rows.length >= 6 && rSquared >= 0.45
        ? "Sedang"
        : "Rendah";

  return {
    status,
    slopeMmPerDay: round(slope, 3),
    velocityCmYear: round((slope * 365) / 10, 2),
    velocityChangeCmYear: round(velocityChange, 2),
    rSquared: round(rSquared, 2),
    confidence,
    detail: `Regresi Z ${rows.length} sampel; perubahan velocity ${formatSignedValue(
      velocityChange,
      "cm/tahun",
      2,
    )}`,
  };
}

function anomalySeverity(value: number, warning: number, critical: number): GnssAnomaly["severity"] {
  if (Math.abs(value) >= critical) return "Critical";
  if (Math.abs(value) >= warning) return "Warning";
  return "Info";
}

function buildGnssAnomalies(
  rows: GnssTrendPoint[],
  quality: GnssQualitySummary,
): GnssAnomaly[] {
  const anomalies: GnssAnomaly[] = [];

  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1];
    const current = rows[index];
    const deltaZ = current.z - previous.z;
    const deltaVelocity = current.velocity - previous.velocity;

    if (Math.abs(deltaZ) >= 20) {
      const severity = anomalySeverity(deltaZ, 20, 50);
      anomalies.push({
        id: `${current.recordedAt}-z`,
        period: current.period,
        recordedAt: current.recordedAt,
        severity,
        parameter: "Z",
        delta: formatSignedValue(deltaZ, "mm"),
        message:
          severity === "Critical"
            ? "Lonjakan vertikal kritis, perlu cek antena atau receiver"
            : "Lonjakan vertikal melewati batas normal",
      });
    }

    if (Math.abs(deltaVelocity) >= 1.2) {
      const severity = anomalySeverity(deltaVelocity, 1.2, 3);
      anomalies.push({
        id: `${current.recordedAt}-velocity`,
        period: current.period,
        recordedAt: current.recordedAt,
        severity,
        parameter: "Velocity",
        delta: formatSignedValue(deltaVelocity, "cm/tahun"),
        message:
          severity === "Critical"
            ? "Perubahan velocity kritis dibanding observasi sebelumnya"
            : "Perubahan velocity perlu divalidasi",
      });
    }
  }

  if (quality.status !== "Valid") {
    anomalies.push({
      id: "quality-latest",
      period: rows[rows.length - 1]?.period ?? "-",
      recordedAt: rows[rows.length - 1]?.recordedAt ?? new Date().toISOString(),
      severity: quality.status === "Bad" ? "Critical" : "Warning",
      parameter: "Quality",
      delta: `${quality.score}/100`,
      message: quality.detail,
    });
  }

  return anomalies
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
    .slice(0, 8);
}

function buildGnssMetrics(
  station: GnssStationMonitoring,
  latest: GnssTrendPoint | null,
  previous: GnssTrendPoint | null,
): GnssMetric[] {
  const delta = (parameter: GnssParameter, unit: string) => {
    if (!latest || !previous) return "Delta belum cukup";
    return `Delta ${formatSignedValue(latest[parameter] - previous[parameter], unit)}`;
  };

  return [
    {
      key: "x",
      label: "X / Easting",
      value: formatSignedValue(latest?.x, "mm"),
      detail: delta("x", "mm"),
    },
    {
      key: "y",
      label: "Y / Northing",
      value: formatSignedValue(latest?.y, "mm"),
      detail: delta("y", "mm"),
    },
    {
      key: "z",
      label: "Z / Up",
      value: formatSignedValue(latest?.z, "mm"),
      detail: `Total ${station.totalSubsidence}`,
    },
    {
      key: "subsidence",
      label: "Akumulasi turun",
      value: formatSignedValue(latest?.subsidence, "cm"),
      detail: `Total pos ${station.totalSubsidence}`,
    },
    {
      key: "velocity",
      label: "Velocity",
      value: formatSignedValue(latest?.velocity, "cm/tahun"),
      detail: delta("velocity", "cm/tahun"),
    },
    {
      key: "pdop",
      label: "PDOP",
      value: latest ? latest.pdop.toFixed(2) : "-",
      detail: latest ? `${latest.satellites} satelit terlacak` : "Belum ada data",
    },
    {
      key: "fixRatio",
      label: "Fix ratio",
      value: latest ? `${latest.fixRatio.toFixed(1)}%` : "-",
      detail: latest ? `${latest.satellites} satelit terlacak` : "Belum ada data",
    },
  ];
}

function toGnssComparisonPoint(station: RawGnssMonitoringStation): GnssComparisonPoint {
  const latestReading = station.gnssReadings[station.gnssReadings.length - 1];
  const latest = latestReading
    ? toGnssTrendPoint(latestReading, station.code, station.gnssReadings.length - 1)
    : null;
  const monitoringStation = toGnssMonitoringStation(station);
  const quality = buildGnssQualitySummary(latest, monitoringStation.device);
  const subsidence = station.totalSubsidenceCm ?? latest?.subsidence ?? 0;
  const velocity = latest?.velocity ?? 0;

  return {
    id: station.code,
    name: station.name,
    area: station.area.name,
    status: toRiskStatus(station.status),
    x: latest?.x ?? 0,
    y: latest?.y ?? 0,
    z: latest?.z ?? 0,
    velocity,
    subsidence,
    qualityScore: quality.score,
    qualityStatus: quality.status,
    lastUpdate: formatClock(station.lastUpdate),
  };
}

export async function getGnssMonitoringData(filters: {
  stationId?: string | null;
  parameter?: string | null;
  range?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  granularity?: string | null;
} = {}): Promise<GnssMonitoringData> {
  const parameter = normalizeGnssParameter(filters.parameter);
  const range = normalizeGnssRange(filters.range);
  const granularity = normalizeAnalysisGranularity(filters.granularity);
  const stations = await getRawGnssStationsForMonitoring();
  const selected =
    stations.find((station) => station.code === filters.stationId) ?? stations[0];

  if (!selected) {
    throw new Error("Belum ada titik GNSS di database.");
  }

  const linkedDevice = selected.devices[0] ?? null;
  const loggerTrend = linkedDevice
    ? await buildLoggerGnssTrend(
        linkedDevice.code,
        selected.baselineLatitude,
        selected.baselineLongitude,
        selected.baselineElevationM,
      )
    : [];
  const allTrend =
    loggerTrend.length > 0
      ? loggerTrend
      : selected.gnssReadings.map((reading, index) =>
          toGnssTrendPoint(reading, selected.code, index),
        );
  const lastTrend = allTrend[allTrend.length - 1] ?? null;
  const trend = filterTrendByRange(
    allTrend,
    range,
    lastTrend,
    filters.dateFrom,
    filters.dateTo,
  );
  const hasDateFilter = hasCustomDateRangeFilter(range, filters.dateFrom, filters.dateTo);
  const rangedTrend = trend.length > 0 || hasDateFilter ? trend : allTrend;
  const visibleTrend = aggregateGnssTrendByGranularity(rangedTrend, granularity);
  const latest = visibleTrend[visibleTrend.length - 1] ?? null;
  const previous =
    visibleTrend.length > 1
      ? visibleTrend[visibleTrend.length - 2]
      : allTrend.length > 1
        ? allTrend[allTrend.length - 2]
        : null;
  const first = visibleTrend[0] ?? null;
  const latestValue = formatGnssParameterValue(parameter, getTrendValue(latest, parameter));
  const previousValue = getTrendValue(previous, parameter);
  const firstValue = getTrendValue(first, parameter);
  const latestRawValue = getTrendValue(latest, parameter);
  const velocityThresholds = getGnssVelocityThresholdProfile(selected);
  const selectedStation = toGnssMonitoringStation(selected);
  const quality = buildGnssQualitySummary(lastTrend, selectedStation.device);
  const trendAnalysis = buildGnssRegressionSummary(rangedTrend);
  const anomalies = buildGnssAnomalies(rangedTrend, quality);
  const comparison = stations.map(toGnssComparisonPoint);

  return {
    stations: stations.map((station) => ({
      id: station.code,
      name: station.name,
      area: station.area.name,
      status: toRiskStatus(station.status),
    })),
    selectedStation,
    selectedParameter: parameter,
    selectedRange: range,
    selectedGranularity: granularity,
    thresholds: parameter === "velocity" ? velocityThresholds : undefined,
    trend: visibleTrend,
    metrics: buildGnssMetrics(selectedStation, latest, previous),
    comparison,
    quality,
    trendAnalysis,
    anomalies,
    analysis: {
      latestValue,
      deltaFromPrevious:
        latestRawValue == null || previousValue == null
          ? "-"
          : formatGnssParameterDelta(parameter, latestRawValue - previousValue),
      periodChange:
        latestRawValue == null || firstValue == null
          ? "-"
          : formatGnssParameterDelta(parameter, latestRawValue - firstValue),
      sampleCount: visibleTrend.length,
    },
  };
}

function normalizeAwlrParameter(value: string | null | undefined): AwlrParameter {
  if (value === "waterLevel") {
    return value;
  }
  return "waterLevel";
}

async function getRawAwlrStationsForMonitoring() {
  return prisma.monitoringPoint.findMany({
    where: { type: "AWLR" },
    include: {
      area: true,
      devices: {
        orderBy: { name: "asc" },
      },
      waterReadings: {
        orderBy: { recordedAt: "asc" },
      },
      alarmThresholds: {
        where: { parameter: "waterLevel" },
        take: 1,
      },
    },
    orderBy: { code: "asc" },
  });
}

type RawAwlrMonitoringStation = Awaited<
  ReturnType<typeof getRawAwlrStationsForMonitoring>
>[number];

function riskStatusFromWaterLevel(
  waterLevel: number,
  waspada: number,
  siaga: number,
  awas: number,
): RiskStatus {
  if (waterLevel >= awas) return "Awas";
  if (waterLevel >= siaga) return "Siaga";
  if (waterLevel >= waspada) return "Waspada";
  return "Normal";
}

function getAwlrThresholdProfile(
  station: RawAwlrMonitoringStation,
  reading?: RawAwlrMonitoringStation["waterReadings"][number],
): AwlrThresholdProfile {
  const threshold = station.alarmThresholds[0];

  return {
    normal: threshold?.normal ?? Math.max((reading?.waspadaM ?? 1.6) - 0.2, 0),
    waspada: threshold?.waspada ?? reading?.waspadaM ?? 1.6,
    siaga: threshold?.siaga ?? reading?.siagaM ?? 1.8,
    awas: threshold?.awas ?? reading?.awasM ?? 2,
    unit: threshold?.unit ?? "m",
  };
}

function toAwlrTrendPoint(
  reading: RawAwlrMonitoringStation["waterReadings"][number],
  thresholds: AwlrThresholdProfile,
): AwlrTrendPoint {
  return {
    period: formatGnssPeriod(reading.recordedAt),
    recordedAt: reading.recordedAt.toISOString(),
    waterLevel: round(reading.waterLevelM, 2),
    marginSiaga: round(thresholds.siaga - reading.waterLevelM, 2),
    marginAwas: round(thresholds.awas - reading.waterLevelM, 2),
    status: riskStatusFromWaterLevel(
      reading.waterLevelM,
      thresholds.waspada,
      thresholds.siaga,
      thresholds.awas,
    ),
  };
}

function aggregateAwlrTrendByGranularity(
  rows: AwlrTrendPoint[],
  granularity: AnalysisGranularity,
  thresholds: AwlrThresholdProfile,
): AwlrTrendPoint[] {
  type Bucket = {
    count: number;
    period: string;
    recordedAt: string;
    waterLevel: number;
  };
  const buckets = new Map<string, Bucket>();

  for (const row of rows) {
    const recordedAt = new Date(row.recordedAt);
    const key = getAnalysisBucketKey(recordedAt, granularity);
    const bucket =
      buckets.get(key) ??
      ({
        count: 0,
        period: formatAnalysisBucketPeriod(recordedAt, granularity),
        recordedAt: row.recordedAt,
        waterLevel: 0,
      } satisfies Bucket);

    bucket.count += 1;
    bucket.recordedAt = row.recordedAt;
    bucket.waterLevel += row.waterLevel;
    buckets.set(key, bucket);
  }

  return Array.from(buckets.values()).map((bucket) => {
    const waterLevel = round(bucket.waterLevel / bucket.count, 2);

    return {
      period: bucket.period,
      recordedAt: bucket.recordedAt,
      waterLevel,
      marginSiaga: round(thresholds.siaga - waterLevel, 2),
      marginAwas: round(thresholds.awas - waterLevel, 2),
      status: riskStatusFromWaterLevel(
        waterLevel,
        thresholds.waspada,
        thresholds.siaga,
        thresholds.awas,
      ),
    };
  });
}

function toAwlrMonitoringStation(station: RawAwlrMonitoringStation): AwlrStationMonitoring {
  const device =
    station.devices.find((item) => item.type === "AWLR" || item.type === "LOGGER") ??
    station.devices[0] ??
    null;
  const latest = station.waterReadings[station.waterReadings.length - 1];

  return {
    id: station.code,
    name: station.name,
    area: station.area.name,
    coordinate: `${station.latitude.toFixed(5)}, ${station.longitude.toFixed(5)}`,
    latitude: station.latitude,
    longitude: station.longitude,
    status: toRiskStatus(station.status),
    currentLevel: formatMeters(latest?.waterLevelM),
    highTideWindow: nextWindowByArea[station.area.name] ?? "Belum dihitung",
    lastUpdate: formatClock(station.lastUpdate),
    device: device
      ? {
          id: device.code,
          name: device.name,
          status: toDeviceStatus(device.status),
          battery: device.battery,
          signal: device.signal,
          solarCharging: device.solarCharging,
          firmwareVersion: device.firmwareVersion ?? "-",
          lastData: formatClock(device.lastDataReceived),
        }
      : null,
  };
}

function getAwlrTrendValue(
  point: AwlrTrendPoint | null | undefined,
  parameter: AwlrParameter,
) {
  return point ? point[parameter] : null;
}

function formatMetersValue(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "-";
  return `${value.toFixed(2)} m`;
}

function formatAwlrDelta(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "-";
  return formatSignedValue(value, "m", 2);
}

function getWaterLevelThresholdDistanceDetail(
  latest: AwlrTrendPoint | null,
  thresholds: AwlrThresholdProfile,
) {
  if (!latest) return "Belum ada data threshold";

  const waterLevel = latest.waterLevel;

  if (waterLevel < thresholds.waspada) {
    return `${formatMetersValue(thresholds.waspada - waterLevel)} menuju Waspada`;
  }

  if (waterLevel < thresholds.siaga) {
    return `Melewati Waspada; ${formatMetersValue(thresholds.siaga - waterLevel)} menuju Siaga`;
  }

  if (waterLevel < thresholds.awas) {
    return `Melewati Siaga; ${formatMetersValue(thresholds.awas - waterLevel)} menuju Awas`;
  }

  return `Melewati Awas ${formatMetersValue(waterLevel - thresholds.awas)}`;
}

function buildAwlrMetrics(
  latest: AwlrTrendPoint | null,
  previous: AwlrTrendPoint | null,
  thresholds: AwlrThresholdProfile,
): AwlrMetric[] {
  return [
    {
      key: "waterLevel",
      label: "Muka air",
      value: formatMetersValue(latest?.waterLevel),
      detail:
        `${getWaterLevelThresholdDistanceDetail(latest, thresholds)}${
          latest && previous
            ? ` · Delta ${formatAwlrDelta(latest.waterLevel - previous.waterLevel)}`
            : ""
        }`,
    },
  ];
}

function toAwlrComparisonPoint(station: RawAwlrMonitoringStation): AwlrComparisonPoint {
  const latestReading = station.waterReadings[station.waterReadings.length - 1];
  const thresholds = getAwlrThresholdProfile(station, latestReading);
  const latest = latestReading ? toAwlrTrendPoint(latestReading, thresholds) : null;

  return {
    id: station.code,
    name: station.name,
    area: station.area.name,
    status: latest?.status ?? toRiskStatus(station.status),
    waterLevel: latest?.waterLevel ?? 0,
    waspada: thresholds.waspada,
    siaga: thresholds.siaga,
    awas: thresholds.awas,
    marginAwas: latest?.marginAwas ?? 0,
    lastUpdate: formatClock(station.lastUpdate),
    latitude:  station.latitude,
    longitude: station.longitude,
  };
}

export async function getAwlrMonitoringData(filters: {
  stationId?: string | null;
  parameter?: string | null;
  range?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  granularity?: string | null;
} = {}): Promise<AwlrMonitoringData> {
  const parameter = normalizeAwlrParameter(filters.parameter);
  const range = normalizeGnssRange(filters.range);
  const granularity = normalizeAnalysisGranularity(filters.granularity);
  const stations = await getRawAwlrStationsForMonitoring();
  const selected =
    stations.find((station) => station.code === filters.stationId) ?? stations[0];

  if (!selected) {
    throw new Error("Belum ada titik AWLR di database.");
  }

  const latestReading = selected.waterReadings[selected.waterReadings.length - 1];
  const thresholds = getAwlrThresholdProfile(selected, latestReading);
  const allTrend = selected.waterReadings.map((reading) =>
    toAwlrTrendPoint(reading, thresholds),
  );
  const lastTrend = allTrend[allTrend.length - 1] ?? null;
  const trend = filterTrendByRange(
    allTrend,
    range,
    lastTrend,
    filters.dateFrom,
    filters.dateTo,
  );
  const hasDateFilter = hasCustomDateRangeFilter(range, filters.dateFrom, filters.dateTo);
  const rangedTrend = trend.length > 0 || hasDateFilter ? trend : allTrend;
  const visibleTrend = aggregateAwlrTrendByGranularity(
    rangedTrend,
    granularity,
    thresholds,
  );
  const latest = visibleTrend[visibleTrend.length - 1] ?? null;
  const previous =
    visibleTrend.length > 1
      ? visibleTrend[visibleTrend.length - 2]
      : allTrend.length > 1
        ? allTrend[allTrend.length - 2]
        : null;
  const first = visibleTrend[0] ?? null;
  const latestValue = formatMetersValue(getAwlrTrendValue(latest, parameter));
  const latestRawValue = getAwlrTrendValue(latest, parameter);
  const previousValue = getAwlrTrendValue(previous, parameter);
  const firstValue = getAwlrTrendValue(first, parameter);

  return {
    stations: stations.map((station) => ({
      id: station.code,
      name: station.name,
      area: station.area.name,
      status: toRiskStatus(station.status),
    })),
    selectedStation: toAwlrMonitoringStation(selected),
    selectedParameter: parameter,
    selectedRange: range,
    selectedGranularity: granularity,
    thresholds,
    trend: visibleTrend,
    metrics: buildAwlrMetrics(latest, previous, thresholds),
    comparison: stations.map(toAwlrComparisonPoint),
    analysis: {
      latestValue,
      deltaFromPrevious:
        latestRawValue == null || previousValue == null
          ? "-"
          : formatAwlrDelta(latestRawValue - previousValue),
      periodChange:
        latestRawValue == null || firstValue == null
          ? "-"
          : formatAwlrDelta(latestRawValue - firstValue),
      sampleCount: visibleTrend.length,
      safeCount: visibleTrend.filter((point) => point.status === "Normal").length,
    },
  };
}

export async function getTideStations(): Promise<TideStation[]> {
  const stations = await prisma.monitoringPoint.findMany({
    where: { type: "AWLR" },
    include: {
      area: true,
      waterReadings: {
        orderBy: { recordedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { code: "asc" },
  });

  return stations.map((station) => {
    const latest = station.waterReadings[0];

    return {
      id: station.code,
      name: station.name,
      area: station.area.name,
      currentLevel: formatMeters(latest?.waterLevelM),
      thresholds: {
        waspada: formatMeters(latest?.waspadaM),
        siaga: formatMeters(latest?.siagaM),
        awas: formatMeters(latest?.awasM),
      },
      status: toRiskStatus(station.status),
      highTideWindow: nextWindowByArea[station.area.name] ?? "Belum dihitung",
      lastUpdate: formatClock(station.lastUpdate),
    };
  });
}

export async function getReportTemplates(): Promise<ReportTemplate[]> {
  const templates = await prisma.reportTemplate.findMany({
    orderBy: { name: "asc" },
  });

  return templates.map((template) => ({
    id: template.id,
    name: template.name,
    period: template.period,
    audience: template.audience,
    formats: Array.isArray(template.formats)
      ? template.formats.filter((format): format is string => typeof format === "string")
      : [],
  }));
}

export async function getGeneratedReports(): Promise<GeneratedReport[]> {
  const reports = await prisma.report.findMany({
    include: { template: true },
    orderBy: { generatedAt: "desc" },
  });

  const statusLabels = {
    QUEUED: "Queued",
    READY: "Ready",
    FAILED: "Failed",
  } as const;

  return reports.map((report) => ({
    id: report.id,
    template: report.template.name,
    area: report.areaName,
    status: statusLabels[report.status],
    generatedAt: formatDayDateTime(report.generatedAt),
    formats: Array.isArray(report.template.formats)
      ? report.template.formats.filter((format): format is string => typeof format === "string")
      : [],
    downloadUrl:
      report.status === "READY"
        ? `/api/reports/${report.id}/download?format=pdf`
        : null,
  }));
}

export async function getDatabaseTableStats(): Promise<DatabaseTableStat[]> {
  const [
    users,
    roles,
    areas,
    points,
    devices,
    gnssReadings,
    waterReadings,
    weatherReadings,
    snapshots,
    alarms,
    events,
    maintenanceLogs,
    reports,
    thresholds,
    pointThresholds,
    riskWeights,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.role.count(),
    prisma.monitoringArea.count(),
    prisma.monitoringPoint.count(),
    prisma.device.count(),
    prisma.gnssReading.count(),
    prisma.waterLevelReading.count(),
    prisma.weatherReading.count(),
    prisma.cameraSnapshot.count(),
    prisma.alarm.count(),
    prisma.event.count(),
    prisma.maintenanceLog.count(),
    prisma.report.count(),
    prisma.threshold.count(),
    prisma.pointThreshold.count(),
    prisma.riskWeight.count(),
  ]);

  return [
    { table: "users", count: users },
    { table: "roles", count: roles },
    { table: "monitoring_areas", count: areas },
    { table: "monitoring_points", count: points },
    { table: "devices", count: devices },
    { table: "gnss_readings", count: gnssReadings },
    { table: "water_level_readings", count: waterReadings },
    { table: "weather_readings", count: weatherReadings },
    { table: "camera_snapshots", count: snapshots },
    { table: "alarms", count: alarms },
    { table: "events", count: events },
    { table: "maintenance_logs", count: maintenanceLogs },
    { table: "reports", count: reports },
    { table: "thresholds", count: thresholds },
    { table: "point_thresholds", count: pointThresholds },
    { table: "risk_weights", count: riskWeights },
  ];
}

export async function getThresholdSettings() {
  return prisma.threshold.findMany({
    orderBy: { metric: "asc" },
  });
}

export async function getAlarmThresholdPointOptions(): Promise<AlarmThresholdPointOption[]> {
  const points = await prisma.monitoringPoint.findMany({
    where: { type: { in: ["GNSS", "AWLR"] } },
    include: { area: true },
    orderBy: [{ type: "asc" }, { code: "asc" }],
  });

  return points.map((point) => ({
    pointId: point.id,
    pointCode: point.code,
    pointName: point.name,
    pointType: point.type === "AWLR" ? "AWLR" : "GNSS",
    area: point.area.name,
  }));
}

export async function getAlarmThresholdSettings(): Promise<AlarmThresholdSetting[]> {
  const thresholds = await prisma.pointThreshold.findMany({
    include: {
      point: {
        include: { area: true },
      },
    },
    orderBy: [
      { point: { type: "asc" } },
      { point: { code: "asc" } },
      { parameter: "asc" },
    ],
  });

  return thresholds.map((threshold) => ({
    id: threshold.id,
    pointId: threshold.pointId,
    pointCode: threshold.point.code,
    pointName: threshold.point.name,
    pointType: threshold.point.type === "AWLR" ? "AWLR" : "GNSS",
    area: threshold.point.area.name,
    parameter: threshold.parameter,
    unit: threshold.unit,
    normal: threshold.normal,
    waspada: threshold.waspada,
    siaga: threshold.siaga,
    awas: threshold.awas,
  }));
}

export async function getUserRoles(): Promise<UserRole[]> {
  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
  });

  return roles.map((role) => ({
    role: role.name,
    access: role.access,
  }));
}

export async function getMaintenanceLogs(): Promise<MaintenanceLog[]> {
  const logs = await prisma.maintenanceLog.findMany({
    include: { device: true },
    orderBy: { scheduledAt: "asc" },
  });

  return logs.map((log) => ({
    id: log.id,
    deviceId: log.deviceId,
    device: log.device.name,
    technician: log.technician,
    schedule: formatDateTime(log.scheduledAt),
    scheduledAt: formatDateTimeInput(log.scheduledAt),
    note: log.note,
    state: toEventState(log.state),
  }));
}

export async function getRiskWeights(): Promise<RiskWeightSetting[]> {
  return prisma.riskWeight.findMany({
    orderBy: { weight: "desc" },
  });
}

function extractLatestSensorValue(
  payload: unknown,
  sensorKey: string,
): string | null {
  if (!payload || typeof payload !== "object") return null;
  const entry = (payload as Record<string, unknown>)[sensorKey];
  if (!entry || typeof entry !== "object") return null;
  const value = (entry as Record<string, unknown>).nilai;
  if (value == null) return null;
  return typeof value === "number" ? value.toString() : String(value);
}

const METERS_PER_DEG_LAT = 111320;

function computeGnssBaseline(point: {
  baselineLatitude: number | null;
  baselineLongitude: number | null;
  baselineElevationM: number | null;
  latitude: number;
  longitude: number;
  currentElevationM: number | null;
}): import("@/lib/types").LoggerGnssBaseline {
  const baselineLat = point.baselineLatitude;
  const baselineLon = point.baselineLongitude;
  const baselineAlt = point.baselineElevationM;
  const currentLat = point.latitude;
  const currentLon = point.longitude;
  const currentAlt = point.currentElevationM;

  let displacementYmm: number | null = null;
  let displacementXmm: number | null = null;
  let displacementZcm: number | null = null;

  if (baselineLat != null) {
    displacementYmm = (currentLat - baselineLat) * METERS_PER_DEG_LAT * 1000;
  }
  if (baselineLon != null) {
    const cosLat = Math.cos(((baselineLat ?? currentLat) * Math.PI) / 180);
    displacementXmm =
      (currentLon - baselineLon) * METERS_PER_DEG_LAT * cosLat * 1000;
  }
  if (baselineAlt != null && currentAlt != null) {
    displacementZcm = (currentAlt - baselineAlt) * 100;
  }

  return {
    baselineLatitude: baselineLat,
    baselineLongitude: baselineLon,
    baselineElevationM: baselineAlt,
    currentLatitude: currentLat,
    currentLongitude: currentLon,
    currentElevationM: currentAlt,
    displacementXmm:
      displacementXmm != null ? Number(displacementXmm.toFixed(2)) : null,
    displacementYmm:
      displacementYmm != null ? Number(displacementYmm.toFixed(2)) : null,
    displacementZcm:
      displacementZcm != null ? Number(displacementZcm.toFixed(2)) : null,
  };
}

export async function getLoggerDevicePickerOptions(): Promise<
  import("@/lib/types").LoggerDevicePickerOption[]
> {
  const devices = await prisma.device.findMany({
    where: {
      OR: [
        { loggerReadings: { some: {} } },
        { loggerParameters: { some: {} } },
      ],
    },
    include: {
      point: { include: { area: true } },
      _count: { select: { loggerReadings: true } },
    },
    orderBy: [{ type: "asc" }, { code: "asc" }],
  });

  return devices.map((device) => ({
    deviceCode: device.code,
    deviceName: device.name,
    pointName: device.point?.name ?? null,
    area: device.point?.area.name ?? null,
    readingCount: device._count.loggerReadings,
  }));
}

function getJakartaDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getJakartaTimeLabel(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export async function getLoggerReadingsForDay(
  deviceCode: string | null | undefined,
  date: string | null | undefined,
): Promise<import("@/lib/types").LoggerReadingDay | null> {
  if (!deviceCode) return null;

  const device = await prisma.device.findUnique({
    where: { code: deviceCode },
    include: {
      point: { include: { area: true } },
      loggerParameters: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!device) return null;

  const allReadings = await prisma.loggerReading.findMany({
    where: { deviceCode },
    select: { recordedAt: true },
  });
  const availableDates = Array.from(
    new Set(allReadings.map((r) => getJakartaDateKey(r.recordedAt))),
  ).sort((a, b) => b.localeCompare(a));

  const targetDate =
    date && availableDates.includes(date)
      ? date
      : (availableDates[0] ?? date ?? getJakartaDateKey(new Date()));

  const dayReadings = await prisma.loggerReading.findMany({
    where: { deviceCode },
    orderBy: { recordedAt: "desc" },
  });
  const filtered = dayReadings.filter(
    (r) => getJakartaDateKey(r.recordedAt) === targetDate,
  );

  const rows: import("@/lib/types").LoggerReadingRow[] = filtered.map(
    (reading) => {
      const values: Record<string, string | null> = {};
      for (const parameter of device.loggerParameters) {
        values[parameter.sensorKey] = extractLatestSensorValue(
          reading.payload,
          parameter.sensorKey,
        );
      }
      return {
        id: reading.id,
        recordedAt: reading.recordedAt.toISOString(),
        recordedAtLabel: getJakartaTimeLabel(reading.recordedAt),
        values,
      };
    },
  );

  return {
    deviceCode: device.code,
    deviceName: device.name,
    pointName: device.point?.name ?? null,
    area: device.point?.area.name ?? null,
    date: targetDate,
    parameters: device.loggerParameters.map((p) => ({
      sensorKey: p.sensorKey,
      label: p.label,
      unit: p.unit,
    })),
    rows,
    totalForDay: rows.length,
    totalAll: allReadings.length,
    availableDates,
  };
}

export async function getLoggerParametersGrouped(
  pointType?: "GNSS" | "AWLR" | "CCTV" | "WEATHER",
): Promise<import("@/lib/types").LoggerDeviceParameters[]> {
  const devices = await prisma.device.findMany({
    where: pointType
      ? {
          OR: [
            { type: pointType as "GNSS" | "AWLR" | "CCTV" | "WEATHER" },
            { point: { type: pointType } },
          ],
        }
      : undefined,
    include: {
      point: {
        include: { area: true },
      },
      loggerParameters: {
        orderBy: { sortOrder: "asc" },
      },
      loggerReadings: {
        orderBy: { recordedAt: "desc" },
        take: 1,
      },
    },
    orderBy: [{ type: "asc" }, { code: "asc" }],
  });

  return devices.map((device) => {
    const latest = device.loggerReadings[0] ?? null;
    const point = device.point;
    return {
      deviceCode: device.code,
      deviceName: device.name,
      deviceType: device.type,
      pointCode: point?.code ?? null,
      pointName: point?.name ?? null,
      pointType: point?.type ?? null,
      area: point?.area.name ?? null,
      lastDataAt: latest ? formatDayDateTime(latest.recordedAt) : null,
      parameters: device.loggerParameters.map((parameter) => ({
        deviceCode: device.code,
        deviceName: device.name,
        deviceType: device.type,
        sensorKey: parameter.sensorKey,
        label: parameter.label,
        unit: parameter.unit,
        visible: parameter.visible,
        sortOrder: parameter.sortOrder,
        latestValue: latest
          ? extractLatestSensorValue(latest.payload, parameter.sensorKey)
          : null,
        recordedAt: latest ? formatDayDateTime(latest.recordedAt) : null,
      })),
      baseline:
        point && point.type === "GNSS" ? computeGnssBaseline(point) : null,
    };
  });
}
