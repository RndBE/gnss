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

function normalizeNullable(value: string | null | undefined) {
  return value?.trim() ? value.trim() : null;
}

export async function POST(request: Request) {
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
    const device = await prisma.device.create({
      data: {
        code: data.code,
        name: data.name,
        type: data.type,
        status: data.status,
        battery: 100,
        signal: 100,
        solarCharging: true,
        firmwareVersion: normalizeNullable(data.firmwareVersion),
        sensorStatus: normalizeNullable(data.sensorStatus),
        lastDataReceived: new Date(),
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
      { error: error instanceof Error ? error.message : "Gagal menyimpan perangkat." },
      { status: 500 },
    );
  }
}
