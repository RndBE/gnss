import type {
  DeviceStatus as PrismaDeviceStatus,
  EventState as PrismaEventState,
  PointType as PrismaPointType,
  RiskStatus as PrismaRiskStatus,
} from "@prisma/client";

import type {
  DeviceStatus,
  EventState,
  PointType,
  RiskStatus,
} from "@/lib/types";

export function toRiskStatus(status: PrismaRiskStatus): RiskStatus {
  const labels: Record<PrismaRiskStatus, RiskStatus> = {
    NORMAL: "Normal",
    WASPADA: "Waspada",
    SIAGA: "Siaga",
    AWAS: "Awas",
  };

  return labels[status];
}

export function toPrismaRiskStatus(status: RiskStatus): PrismaRiskStatus {
  const labels: Record<RiskStatus, PrismaRiskStatus> = {
    Normal: "NORMAL",
    Waspada: "WASPADA",
    Siaga: "SIAGA",
    Awas: "AWAS",
  };

  return labels[status];
}

export function toDeviceStatus(status: PrismaDeviceStatus): DeviceStatus {
  const labels: Record<PrismaDeviceStatus, DeviceStatus> = {
    ONLINE: "Online",
    WEAK: "Weak",
    OFFLINE: "Offline",
    MAINTENANCE: "Maintenance",
  };

  return labels[status];
}

export function toEventState(state: PrismaEventState): EventState {
  const labels: Record<PrismaEventState, EventState> = {
    OPEN: "Open",
    IN_PROGRESS: "In Progress",
    RESOLVED: "Resolved",
  };

  return labels[state];
}

export function toPrismaEventState(state: EventState): PrismaEventState {
  const labels: Record<EventState, PrismaEventState> = {
    Open: "OPEN",
    "In Progress": "IN_PROGRESS",
    Resolved: "RESOLVED",
  };

  return labels[state];
}

export function toPointType(type: PrismaPointType): PointType {
  if (type === "AWLR") return "AWLR";
  if (type === "CCTV") return "CCTV";
  return "GNSS";
}

export function formatClock(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  })
    .format(date)
    .replace(":", ".");
}

export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  })
    .format(date)
    .replace("pukul ", "")
    .replace(":", ".");
}

export function formatDayDateTime(date: Date) {
  const parts = new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("weekday")}, ${get("day")} ${get("month")} ${get("hour")}.${get("minute")}`;
}

export function formatPeriod(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export function formatSignedCm(value: number | null | undefined) {
  if (value == null) return "-";
  return `${value.toFixed(1)} cm/tahun`;
}

export function formatMeters(value: number | null | undefined) {
  if (value == null) return "-";
  return `${value.toFixed(2)} m`;
}
