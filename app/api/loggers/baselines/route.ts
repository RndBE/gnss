import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const baselineSchema = z
  .object({
    deviceCode: z.string().min(1),
    baselineLatitude: z.number().nullable().optional(),
    baselineLongitude: z.number().nullable().optional(),
    baselineElevationM: z.number().nullable().optional(),
    useLatestReading: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.useLatestReading === true ||
      data.baselineLatitude !== undefined ||
      data.baselineLongitude !== undefined ||
      data.baselineElevationM !== undefined,
    {
      message:
        "Minimal salah satu baseline harus diisi, atau set useLatestReading=true.",
    },
  );

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = baselineSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Payload tidak valid.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { deviceCode, useLatestReading } = parsed.data;
  const device = await prisma.device.findUnique({
    where: { code: deviceCode },
    include: { point: true },
  });

  if (!device) {
    return Response.json({ error: "Device tidak ditemukan." }, { status: 404 });
  }

  if (!device.point) {
    return Response.json(
      { error: "Device belum terhubung ke MonitoringPoint." },
      { status: 400 },
    );
  }

  const data: {
    baselineLatitude?: number | null;
    baselineLongitude?: number | null;
    baselineElevationM?: number | null;
    totalSubsidenceCm?: number | null;
    velocityCmYear?: number | null;
  } = {};

  if (useLatestReading) {
    const latest = await prisma.loggerReading.findFirst({
      where: { deviceCode },
      orderBy: { recordedAt: "desc" },
    });
    if (!latest) {
      return Response.json(
        { error: "Belum ada reading dari logger ini." },
        { status: 400 },
      );
    }
    const payload = latest.payload as Record<string, unknown>;
    for (const value of Object.values(payload)) {
      if (!value || typeof value !== "object") continue;
      const entry = value as { nama?: unknown; nilai?: unknown };
      const numeric =
        typeof entry.nilai === "number"
          ? entry.nilai
          : typeof entry.nilai === "string"
            ? Number(entry.nilai)
            : NaN;
      if (!Number.isFinite(numeric)) continue;
      if (entry.nama === "Latitude") data.baselineLatitude = numeric;
      if (entry.nama === "Longitude") data.baselineLongitude = numeric;
      if (entry.nama === "Altitude") data.baselineElevationM = numeric;
    }
  } else {
    if (parsed.data.baselineLatitude !== undefined)
      data.baselineLatitude = parsed.data.baselineLatitude;
    if (parsed.data.baselineLongitude !== undefined)
      data.baselineLongitude = parsed.data.baselineLongitude;
    if (parsed.data.baselineElevationM !== undefined)
      data.baselineElevationM = parsed.data.baselineElevationM;
  }

  if (
    data.baselineElevationM != null &&
    device.point.currentElevationM != null
  ) {
    data.totalSubsidenceCm =
      (device.point.currentElevationM - data.baselineElevationM) * 100;
    data.velocityCmYear = 0;
  }

  const updated = await prisma.monitoringPoint.update({
    where: { id: device.point.id },
    data,
  });

  return Response.json({
    ok: true,
    point: {
      code: updated.code,
      baselineLatitude: updated.baselineLatitude,
      baselineLongitude: updated.baselineLongitude,
      baselineElevationM: updated.baselineElevationM,
      latitude: updated.latitude,
      longitude: updated.longitude,
      currentElevationM: updated.currentElevationM,
      totalSubsidenceCm: updated.totalSubsidenceCm,
    },
  });
}
