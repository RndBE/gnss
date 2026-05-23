export type RiskStatus = "Normal" | "Waspada" | "Siaga" | "Awas";

export type PointType = "GNSS" | "AWLR" | "CCTV";

export type DeviceStatus = "Online" | "Weak" | "Offline" | "Maintenance";

export type EventState = "Open" | "In Progress" | "Resolved";

export type DashboardSummary = {
  updatedAt: string;
  activeArea: string;
  kpis: {
    maxSubsidence: string;
    averageSubsidence: string;
    waterLevel: string;
    floodRisk: RiskStatus;
    activePoints: string;
    activeAlarms: number;
    maxSubsidenceStation: string;
    waterLevelStation: string;
    activeLoggerDetail: string;
  };
  monitoringPoints: MonitoringPoint[];
  trend: TrendDatum[];
  tide: TideDatum[];
  riskAreas: RiskArea[];
  alarms: AlarmEvent[];
  devices: DeviceTelemetry[];
  dataLoggers: DataLoggerFeed[];
  cctvSnapshots: CctvSnapshot[];
};

export type MonitoringPoint = {
  id: string;
  name: string;
  type: PointType;
  lat: number;
  lon: number;
  area: string;
  status: RiskStatus;
  value: string;
  lastUpdate: string;
};

export type TrendDatum = {
  period: string;
  gnssPkl01: number;
  gnssSmg02: number;
  gnssDmk03: number;
};

export type TideDatum = {
  hour: string;
  waterLevel: number;
  waspada: number;
  siaga: number;
};

export type RiskArea = {
  area: string;
  status: RiskStatus;
  score: number;
  subsidenceRate: string;
  waterLevel: string;
  nextWindow: string;
};

export type AlarmEvent = {
  id: string;
  type: string;
  area: string;
  status: RiskStatus;
  state: EventState;
  time: string;
  message: string;
  requiresValidation: boolean;
};

export type DeviceTelemetry = {
  id: string;
  name: string;
  type: PointType | "LOGGER";
  status: DeviceStatus;
  battery: number;
  signal: number;
  lastData: string;
};

export type DeviceManagementItem = {
  id: string;
  code: string;
  name: string;
  type: PointType | "LOGGER" | "WEATHER";
  status: DeviceStatus;
  battery: number;
  signal: number;
  temperatureC: number | null;
  humidityPct: number | null;
  solarCharging: boolean;
  firmwareVersion: string;
  sensorStatus: string;
  lastDataReceived: string;
  lastDataLabel: string;
  pointId: string;
  pointName: string;
  pointType: PointType | "WEATHER";
  area: string;
};

export type DevicePointOption = {
  id: string;
  code: string;
  name: string;
  type: PointType | "WEATHER";
  area: string;
};

export type CctvSnapshot = {
  id: string;
  name: string;
  area: string;
  status: RiskStatus;
  capturedAt: string;
  visibility: "Clear" | "Rain" | "Low light";
  imageUrl: string | null;
  note: string | null;
};

export type GnssStation = {
  id: string;
  name: string;
  coordinate: string;
  baselineElevation: string;
  currentElevation: string;
  totalSubsidence: string;
  velocity: string;
  status: RiskStatus;
  lastUpdate: string;
};

export type GnssParameter =
  | "x"
  | "y"
  | "z"
  | "velocity"
  | "subsidence"
  | "pdop"
  | "fixRatio";

export type GnssRange = "30d" | "90d" | "180d" | "all" | "custom";

export type DataAnalysisMode = "gnss" | "awlr";

export type AnalysisGranularity = "hourly" | "daily";

export type AwlrParameter = "waterLevel";

export type GnssStationOption = {
  id: string;
  name: string;
  area: string;
  status: RiskStatus;
};

export type GnssDeviceInfo = {
  id: string;
  name: string;
  status: DeviceStatus;
  battery: number;
  signal: number;
  solarCharging: boolean;
  firmwareVersion: string;
  lastData: string;
};

export type GnssTrendPoint = {
  period: string;
  recordedAt: string;
  x: number;
  y: number;
  z: number;
  velocity: number;
  elevation: number;
  subsidence: number;
  satellites: number;
  pdop: number;
  fixRatio: number;
};

export type GnssQualityStatus = "Valid" | "Suspect" | "Bad";

export type GnssTrendStatus = "Membaik" | "Stabil" | "Memburuk";

export type GnssAnomalySeverity = "Info" | "Warning" | "Critical";

export type GnssQualitySummary = {
  score: number;
  status: GnssQualityStatus;
  label: string;
  detail: string;
  pdop: number | null;
  fixRatio: number | null;
  satellites: number | null;
  signal: number | null;
  battery: number | null;
  dataGapHours: number | null;
};

export type GnssRegressionSummary = {
  status: GnssTrendStatus;
  slopeMmPerDay: number;
  velocityCmYear: number;
  velocityChangeCmYear: number;
  rSquared: number;
  confidence: "Tinggi" | "Sedang" | "Rendah";
  detail: string;
};

export type GnssAnomaly = {
  id: string;
  period: string;
  recordedAt: string;
  severity: GnssAnomalySeverity;
  parameter: "Z" | "Velocity" | "Quality";
  delta: string;
  message: string;
};

export type GnssMetric = {
  key: GnssParameter | "elevation" | "subsidence";
  label: string;
  value: string;
  detail: string;
};

export type GnssStationMonitoring = {
  id: string;
  name: string;
  area: string;
  coordinate: string;
  latitude: number;
  longitude: number;
  baselineElevation: string;
  currentElevation: string;
  totalSubsidence: string;
  velocity: string;
  status: RiskStatus;
  lastUpdate: string;
  device: GnssDeviceInfo | null;
};

export type GnssComparisonPoint = {
  id: string;
  name: string;
  area: string;
  status: RiskStatus;
  x: number;
  y: number;
  z: number;
  velocity: number;
  subsidence: number;
  qualityScore: number;
  qualityStatus: GnssQualityStatus;
  lastUpdate: string;
};

export type GnssMonitoringData = {
  stations: GnssStationOption[];
  selectedStation: GnssStationMonitoring;
  selectedParameter: GnssParameter;
  selectedRange: GnssRange;
  selectedGranularity: AnalysisGranularity;
  thresholds?: AwlrThresholdProfile;
  trend: GnssTrendPoint[];
  metrics: GnssMetric[];
  comparison: GnssComparisonPoint[];
  quality: GnssQualitySummary;
  trendAnalysis: GnssRegressionSummary;
  anomalies: GnssAnomaly[];
  analysis: {
    latestValue: string;
    deltaFromPrevious: string;
    periodChange: string;
    sampleCount: number;
  };
};

export type AwlrStationOption = {
  id: string;
  name: string;
  area: string;
  status: RiskStatus;
};

export type AwlrTrendPoint = {
  period: string;
  recordedAt: string;
  waterLevel: number;
  marginSiaga: number;
  marginAwas: number;
  status: RiskStatus;
};

export type AwlrThresholdProfile = {
  normal: number;
  waspada: number;
  siaga: number;
  awas: number;
  unit: string;
};

export type AwlrMetric = {
  key: AwlrParameter;
  label: string;
  value: string;
  detail: string;
};

export type AwlrStationMonitoring = {
  id: string;
  name: string;
  area: string;
  coordinate: string;
  latitude: number;
  longitude: number;
  status: RiskStatus;
  currentLevel: string;
  highTideWindow: string;
  lastUpdate: string;
  device: GnssDeviceInfo | null;
};

export type AwlrComparisonPoint = {
  id: string;
  name: string;
  area: string;
  status: RiskStatus;
  waterLevel: number;
  waspada: number;
  siaga: number;
  awas: number;
  marginAwas: number;
  lastUpdate: string;
  latitude: number;
  longitude: number;
};

export type AwlrMonitoringData = {
  stations: AwlrStationOption[];
  selectedStation: AwlrStationMonitoring;
  selectedParameter: AwlrParameter;
  selectedRange: GnssRange;
  selectedGranularity: AnalysisGranularity;
  thresholds: AwlrThresholdProfile;
  trend: AwlrTrendPoint[];
  metrics: AwlrMetric[];
  comparison: AwlrComparisonPoint[];
  analysis: {
    latestValue: string;
    deltaFromPrevious: string;
    periodChange: string;
    sampleCount: number;
    safeCount: number;
  };
};

export type DataLoggerParameter = {
  key: string;
  label: string;
  value: string;
};

export type DataLoggerFeed = {
  id: string;
  name: string;
  pointId: string;
  pointName: string;
  pointType: "GNSS" | "AWLR";
  area: string;
  coordinate: string;
  intervalLabel: string;
  status: DeviceStatus;
  pointStatus: RiskStatus;
  battery: number | null;
  signal: number | null;
  firmwareVersion: string;
  lastData: string;
  parameters: DataLoggerParameter[];
};

export type TideStation = {
  id: string;
  name: string;
  area: string;
  currentLevel: string;
  thresholds: {
    waspada: string;
    siaga: string;
    awas: string;
  };
  status: RiskStatus;
  highTideWindow: string;
  lastUpdate: string;
};

export type ReportTemplate = {
  id: string;
  name: string;
  period: string;
  audience: string;
  formats: string[];
};

export type GeneratedReport = {
  id: string;
  template: string;
  area: string;
  status: "Queued" | "Ready" | "Failed";
  generatedAt: string;
  formats: string[];
  downloadUrl: string | null;
};

export type ThresholdSetting = {
  id: string;
  metric: string;
  normal: string;
  waspada: string;
  siaga: string;
  awas: string;
};

export type UserRole = {
  role: string;
  access: string;
};

export type MaintenanceLog = {
  id: string;
  deviceId: string;
  device: string;
  technician: string;
  schedule: string;
  scheduledAt: string;
  note: string;
  state: EventState;
};

export type RiskWeightSetting = {
  id: string;
  metric: string;
  weight: number;
  source: string;
};

export type DatabaseTableStat = {
  table: string;
  count: number;
};

export type AlarmThresholdSetting = {
  id: string;
  pointId: string;
  pointCode: string;
  pointName: string;
  pointType: "GNSS" | "AWLR";
  area: string;
  parameter: string;
  unit: string;
  normal: number;
  waspada: number;
  siaga: number;
  awas: number;
};

export type AlarmThresholdPointOption = {
  pointId: string;
  pointCode: string;
  pointName: string;
  pointType: "GNSS" | "AWLR";
  area: string;
};
