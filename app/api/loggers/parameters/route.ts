import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  deviceCode: z.string().min(1),
  sensorKey: z.string().min(1),
  visible: z.boolean(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deviceCode = searchParams.get("deviceCode");
  const deviceType = searchParams.get("type");

  const parameters = await prisma.loggerParameter.findMany({
    where: {
      ...(deviceCode ? { deviceCode } : {}),
      ...(deviceType
        ? {
            device: {
              type: deviceType as "GNSS" | "AWLR" | "CCTV" | "LOGGER" | "WEATHER",
            },
          }
        : {}),
    },
    include: {
      device: {
        select: {
          code: true,
          name: true,
          type: true,
        },
      },
    },
    orderBy: [{ deviceCode: "asc" }, { sortOrder: "asc" }],
  });

  return Response.json({ parameters });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Payload tidak valid.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { deviceCode, sensorKey, visible } = parsed.data;

  try {
    const updated = await prisma.loggerParameter.update({
      where: {
        deviceCode_sensorKey: {
          deviceCode,
          sensorKey,
        },
      },
      data: { visible },
    });

    return Response.json({ ok: true, parameter: updated });
  } catch {
    return Response.json(
      { error: "Parameter tidak ditemukan." },
      { status: 404 },
    );
  }
}
