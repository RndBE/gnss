import { z } from "zod";

import {
  getAlarmThresholdPointOptions,
  getAlarmThresholdSettings,
} from "@/lib/backend/queries";
import { synchronizeWaterLevelAlarmForPoint } from "@/lib/backend/alarm-sync";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const thresholdSchema = z.object({
  pointId: z.string().min(1),
  parameter: z.string().min(1),
  unit: z.string().min(1),
  normal: z.coerce.number(),
  waspada: z.coerce.number(),
  siaga: z.coerce.number(),
  awas: z.coerce.number(),
});

const updateSchema = thresholdSchema.extend({
  id: z.string().min(1),
});

const deleteSchema = z.object({
  id: z.string().min(1),
});

function validateThresholdOrder(values: z.infer<typeof thresholdSchema>) {
  return (
    values.normal <= values.waspada &&
    values.waspada <= values.siaga &&
    values.siaga <= values.awas
  );
}

async function validatePoint(pointId: string) {
  return prisma.monitoringPoint.findFirst({
    where: {
      id: pointId,
      type: { in: ["GNSS", "AWLR"] },
    },
  });
}

export async function GET() {
  const [thresholds, points] = await Promise.all([
    getAlarmThresholdSettings(),
    getAlarmThresholdPointOptions(),
  ]);

  return Response.json({ thresholds, points });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = thresholdSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Payload threshold alarm tidak valid.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (!validateThresholdOrder(parsed.data)) {
    return Response.json(
      { error: "Urutan threshold harus normal <= waspada <= siaga <= awas." },
      { status: 400 },
    );
  }

  const point = await validatePoint(parsed.data.pointId);
  if (!point) {
    return Response.json({ error: "Titik GNSS/AWLR tidak ditemukan." }, { status: 404 });
  }

  const duplicate = await prisma.pointThreshold.findUnique({
    where: {
      pointId_parameter: {
        pointId: parsed.data.pointId,
        parameter: parsed.data.parameter,
      },
    },
  });

  if (duplicate) {
    return Response.json(
      { error: "Threshold untuk pos dan parameter ini sudah ada." },
      { status: 409 },
    );
  }

  const threshold = await prisma.pointThreshold.create({
    data: parsed.data,
  });
  const sync = await synchronizeWaterLevelAlarmForPoint(parsed.data.pointId);

  return Response.json({ ok: true, threshold, sync }, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Payload threshold alarm tidak valid.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (!validateThresholdOrder(parsed.data)) {
    return Response.json(
      { error: "Urutan threshold harus normal <= waspada <= siaga <= awas." },
      { status: 400 },
    );
  }

  const existing = await prisma.pointThreshold.findUnique({
    where: { id: parsed.data.id },
  });

  if (!existing) {
    return Response.json({ error: "Threshold alarm tidak ditemukan." }, { status: 404 });
  }

  const point = await validatePoint(parsed.data.pointId);
  if (!point) {
    return Response.json({ error: "Titik GNSS/AWLR tidak ditemukan." }, { status: 404 });
  }

  const threshold = await prisma.pointThreshold.update({
    where: { id: parsed.data.id },
    data: {
      pointId: parsed.data.pointId,
      parameter: parsed.data.parameter,
      unit: parsed.data.unit,
      normal: parsed.data.normal,
      waspada: parsed.data.waspada,
      siaga: parsed.data.siaga,
      awas: parsed.data.awas,
    },
  });
  const sync = await synchronizeWaterLevelAlarmForPoint(parsed.data.pointId);

  return Response.json({ ok: true, threshold, sync });
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = deleteSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Payload hapus threshold alarm tidak valid.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.pointThreshold.findUnique({
    where: { id: parsed.data.id },
  });

  if (!existing) {
    return Response.json({ error: "Threshold alarm tidak ditemukan." }, { status: 404 });
  }

  const pointId = existing.pointId;

  await prisma.pointThreshold.delete({
    where: { id: parsed.data.id },
  });
  const sync = await synchronizeWaterLevelAlarmForPoint(pointId);

  return Response.json({ ok: true, sync });
}
