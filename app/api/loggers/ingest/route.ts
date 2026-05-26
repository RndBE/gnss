import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const sensorSchema = z.object({
  nama: z.string(),
  nilai: z.union([z.string(), z.number()]),
  satuan: z.string().optional().default("-"),
});

const payloadSchema = z
  .object({
    id_alat: z.string().min(1),
    jam: z.string().optional(),
    hari: z.string().optional(),
  })
  .catchall(z.any());

function parseRecordedAt(hari?: string, jam?: string) {
  if (hari && jam) {
    const iso = `${hari}T${jam}`;
    const date = new Date(iso);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return new Date();
}

function isSensorEntry(value: unknown): value is z.infer<typeof sensorSchema> {
  return sensorSchema.safeParse(value).success;
}

function findSensorByLabel(
  body: Record<string, unknown>,
  label: string,
): { value: string | number; unit: string } | null {
  for (const [key, raw] of Object.entries(body)) {
    if (!key.startsWith("sensor")) continue;
    if (!isSensorEntry(raw)) continue;
    if (raw.nama === label) {
      return { value: raw.nilai, unit: raw.satuan ?? "-" };
    }
  }
  return null;
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const resetBaseline = searchParams.get("resetBaseline") === "true";
  const body = await request.json().catch(() => ({}));
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Payload logger tidak valid.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const device = await prisma.device.findUnique({
    where: { code: data.id_alat },
    include: { point: true },
  });

  if (!device) {
    return Response.json(
      { error: `Perangkat dengan id_alat "${data.id_alat}" tidak ditemukan.` },
      { status: 404 },
    );
  }

  const recordedAt = parseRecordedAt(data.hari, data.jam);

  const sensorEntries: Array<{
    sensorKey: string;
    label: string;
    unit: string;
  }> = [];

  const rawBody = body as Record<string, unknown>;
  for (const [key, value] of Object.entries(rawBody)) {
    if (!key.startsWith("sensor")) continue;
    if (!isSensorEntry(value)) continue;
    sensorEntries.push({
      sensorKey: key,
      label: value.nama,
      unit: value.satuan ?? "-",
    });
  }

  const latitude = toNumber(findSensorByLabel(rawBody, "Latitude")?.value);
  const longitude = toNumber(findSensorByLabel(rawBody, "Longitude")?.value);
  const altitude = toNumber(findSensorByLabel(rawBody, "Altitude")?.value);

  const pointDerived: {
    latitude?: number;
    longitude?: number;
    baselineLatitude?: number;
    baselineLongitude?: number;
    baselineElevationM?: number;
    currentElevationM?: number;
    totalSubsidenceCm?: number;
    velocityCmYear?: number;
    lastUpdate?: Date;
  } = {};

  if (device.point) {
    pointDerived.lastUpdate = recordedAt;

    if (latitude != null) {
      pointDerived.latitude = latitude;
      if (resetBaseline || device.point.baselineLatitude == null) {
        pointDerived.baselineLatitude = latitude;
      }
    }
    if (longitude != null) {
      pointDerived.longitude = longitude;
      if (resetBaseline || device.point.baselineLongitude == null) {
        pointDerived.baselineLongitude = longitude;
      }
    }

    if (altitude != null) {
      pointDerived.currentElevationM = altitude;

      const baseline =
        !resetBaseline && device.point.baselineElevationM != null
          ? device.point.baselineElevationM
          : altitude;
      pointDerived.baselineElevationM = baseline;
      pointDerived.totalSubsidenceCm = (altitude - baseline) * 100;

      const oldestReading = await prisma.loggerReading.findFirst({
        where: { deviceCode: device.code },
        orderBy: { recordedAt: "asc" },
      });
      const baselineAt = oldestReading?.recordedAt ?? recordedAt;
      const elapsedMs = recordedAt.getTime() - baselineAt.getTime();
      if (elapsedMs > 0) {
        const years = elapsedMs / MS_PER_YEAR;
        pointDerived.velocityCmYear = ((altitude - baseline) * 100) / years;
      } else {
        pointDerived.velocityCmYear = 0;
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.loggerReading.create({
      data: {
        deviceCode: device.code,
        recordedAt,
        payload: body,
      },
    });

    await tx.device.update({
      where: { id: device.id },
      data: { lastDataReceived: recordedAt },
    });

    if (device.point && Object.keys(pointDerived).length > 0) {
      await tx.monitoringPoint.update({
        where: { id: device.point.id },
        data: pointDerived,
      });
    }

    for (let index = 0; index < sensorEntries.length; index += 1) {
      const entry = sensorEntries[index];
      await tx.loggerParameter.upsert({
        where: {
          deviceCode_sensorKey: {
            deviceCode: device.code,
            sensorKey: entry.sensorKey,
          },
        },
        update: {
          label: entry.label,
          unit: entry.unit,
          sortOrder: index,
        },
        create: {
          deviceCode: device.code,
          sensorKey: entry.sensorKey,
          label: entry.label,
          unit: entry.unit,
          sortOrder: index,
          visible: true,
        },
      });
    }
  });

  return Response.json({
    ok: true,
    deviceCode: device.code,
    recordedAt: recordedAt.toISOString(),
    parametersDetected: sensorEntries.length,
    pointUpdated: device.point ? device.point.code : null,
    derived: device.point
      ? {
          latitude: pointDerived.latitude ?? null,
          longitude: pointDerived.longitude ?? null,
          baselineLatitude: pointDerived.baselineLatitude ?? null,
          baselineLongitude: pointDerived.baselineLongitude ?? null,
          baselineElevationM: pointDerived.baselineElevationM ?? null,
          currentElevationM: pointDerived.currentElevationM ?? null,
          totalSubsidenceCm:
            pointDerived.totalSubsidenceCm != null
              ? Number(pointDerived.totalSubsidenceCm.toFixed(2))
              : null,
          velocityCmYear:
            pointDerived.velocityCmYear != null
              ? Number(pointDerived.velocityCmYear.toFixed(2))
              : null,
        }
      : null,
  });
}
