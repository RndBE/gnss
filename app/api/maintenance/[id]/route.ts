import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const maintenanceSchema = z.object({
  deviceId: z.string().trim().min(1),
  technician: z.string().trim().min(2),
  scheduledAt: z.string().trim().min(1),
  note: z.string().trim().min(3),
  state: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]),
});

type MaintenanceRouteContext = {
  params: Promise<{ id: string }>;
};

function parseJakartaDateTime(value: string) {
  const normalized = value.length === 16 ? `${value}:00` : value;
  const date = new Date(`${normalized}+07:00`);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Tanggal maintenance tidak valid.");
  }

  return date;
}

export async function PATCH(request: Request, context: MaintenanceRouteContext) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const parsed = maintenanceSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Data maintenance tidak valid.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const data = parsed.data;
    const maintenanceLog = await prisma.maintenanceLog.update({
      where: { id },
      data: {
        deviceId: data.deviceId,
        technician: data.technician,
        scheduledAt: parseJakartaDateTime(data.scheduledAt),
        note: data.note,
        state: data.state,
      },
    });

    return Response.json({ maintenanceLog });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Gagal memperbarui maintenance." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: MaintenanceRouteContext) {
  const { id } = await context.params;

  await prisma.maintenanceLog.delete({ where: { id } });

  return Response.json({ ok: true });
}
