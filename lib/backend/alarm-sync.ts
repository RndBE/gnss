import type { RiskStatus as PrismaRiskStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { RiskStatus } from "@/lib/types";

type WaterThresholds = {
  waspada: number;
  siaga: number;
  awas: number;
};

const prismaStatusByRisk: Record<RiskStatus, PrismaRiskStatus> = {
  Normal: "NORMAL",
  Waspada: "WASPADA",
  Siaga: "SIAGA",
  Awas: "AWAS",
};

function formatMetersForAlarm(value: number) {
  return `${value.toFixed(2)} m`;
}

export function getWaterLevelRiskStatus(
  waterLevel: number,
  thresholds: WaterThresholds,
): RiskStatus {
  if (waterLevel >= thresholds.awas) return "Awas";
  if (waterLevel >= thresholds.siaga) return "Siaga";
  if (waterLevel >= thresholds.waspada) return "Waspada";
  return "Normal";
}

export function buildWaterLevelAlarmMessage(
  waterLevel: number,
  status: RiskStatus,
  thresholds: WaterThresholds,
) {
  if (status === "Awas") {
    return `Muka air ${formatMetersForAlarm(waterLevel)} melewati ambang Awas ${formatMetersForAlarm(thresholds.awas)}.`;
  }

  if (status === "Siaga") {
    return `Muka air ${formatMetersForAlarm(waterLevel)} melewati ambang Siaga ${formatMetersForAlarm(thresholds.siaga)}.`;
  }

  if (status === "Waspada") {
    return `Muka air ${formatMetersForAlarm(waterLevel)} melewati ambang Waspada ${formatMetersForAlarm(thresholds.waspada)}.`;
  }

  return `Muka air ${formatMetersForAlarm(waterLevel)} berada di bawah ambang Waspada ${formatMetersForAlarm(thresholds.waspada)}.`;
}

export async function synchronizeWaterLevelAlarmForPoint(pointId: string) {
  const point = await prisma.monitoringPoint.findUnique({
    where: { id: pointId },
    include: {
      area: true,
      waterReadings: {
        orderBy: { recordedAt: "desc" },
        take: 1,
      },
      alarmThresholds: {
        where: { parameter: "waterLevel" },
        take: 1,
      },
    },
  });

  if (!point || point.type !== "AWLR") {
    return null;
  }

  const latest = point.waterReadings[0];
  if (!latest) {
    return null;
  }

  const threshold = point.alarmThresholds[0];
  const thresholds = {
    waspada: threshold?.waspada ?? latest.waspadaM,
    siaga: threshold?.siaga ?? latest.siagaM,
    awas: threshold?.awas ?? latest.awasM,
  };
  const status = getWaterLevelRiskStatus(latest.waterLevelM, thresholds);
  const message = buildWaterLevelAlarmMessage(latest.waterLevelM, status, thresholds);
  const prismaStatus = prismaStatusByRisk[status];

  await prisma.monitoringPoint.update({
    where: { id: point.id },
    data: { status: prismaStatus },
  });

  const activeAlarm = await prisma.alarm.findFirst({
    where: {
      pointId: point.id,
      type: "Water Level Alert",
      state: { in: ["OPEN", "IN_PROGRESS"] },
    },
    orderBy: { occurredAt: "desc" },
  });

  if (status === "Normal") {
    if (activeAlarm) {
      await prisma.alarm.update({
        where: { id: activeAlarm.id },
        data: {
          status: prismaStatus,
          state: "RESOLVED",
          resolvedAt: new Date(),
          resolutionNote: "Otomatis terselesaikan setelah threshold per pos disinkronkan.",
          message,
        },
      });
    }

    return { status, message };
  }

  if (activeAlarm) {
    await prisma.alarm.update({
      where: { id: activeAlarm.id },
      data: {
        status: prismaStatus,
        message:
          activeAlarm.state === "OPEN"
            ? `Menunggu validasi operator. ${message}`
            : message,
      },
    });

    return { status, message };
  }

  await prisma.alarm.create({
    data: {
      code: `alm-awlr-${point.code}-${Date.now()}`,
      type: "Water Level Alert",
      areaId: point.areaId,
      pointId: point.id,
      status: prismaStatus,
      state: "OPEN",
      occurredAt: latest.recordedAt,
      message: `Menunggu validasi operator. ${message}`,
    },
  });

  return { status, message };
}
