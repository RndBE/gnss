import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const deviceSchema = z.object({
  code: z.string().trim().min(2),
  name: z.string().trim().min(2),
  type: z.enum(["GNSS", "AWLR", "CCTV", "LOGGER", "WEATHER"]),
  status: z.enum(["ONLINE", "WEAK", "OFFLINE", "MAINTENANCE"]),
  firmwareVersion: z.string().trim().optional().nullable(),
  sensorStatus: z.string().trim().optional().nullable(),
  pointId: z.string().trim().optional().nullable(),
});

type DeviceRouteContext = {
  params: Promise<{ id: string }>;
};

function normalizeNullable(value: string | null | undefined) {
  return value?.trim() ? value.trim() : null;
}

export async function PATCH(request: Request, context: DeviceRouteContext) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const parsed = deviceSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Data perangkat tidak valid.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const data = parsed.data;
    const device = await prisma.device.update({
      where: { id },
      data: {
        code: data.code,
        name: data.name,
        type: data.type,
        status: data.status,
        firmwareVersion: normalizeNullable(data.firmwareVersion),
        sensorStatus: normalizeNullable(data.sensorStatus),
        pointId: normalizeNullable(data.pointId),
      },
    });

    return Response.json({ device });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json(
        { error: "Kode perangkat sudah dipakai." },
        { status: 409 },
      );
    }

    return Response.json(
      { error: error instanceof Error ? error.message : "Gagal memperbarui perangkat." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: DeviceRouteContext) {
  const { id } = await context.params;

  await prisma.$transaction([
    prisma.maintenanceLog.deleteMany({ where: { deviceId: id } }),
    prisma.device.delete({ where: { id } }),
  ]);

  return Response.json({ ok: true });
}
