import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const validateSchema = z.object({
  alarmId: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = validateSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Payload validasi alarm tidak sesuai.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const alarm = await prisma.alarm.findFirst({
    where: {
      OR: [{ id: parsed.data.alarmId }, { code: parsed.data.alarmId }],
    },
  });

  if (!alarm) {
    return Response.json({ error: "Alarm tidak ditemukan." }, { status: 404 });
  }

  const updated = await prisma.alarm.update({
    where: { id: alarm.id },
    data: {
      state: "IN_PROGRESS",
      resolutionNote: null,
      resolvedAt: null,
      message: alarm.message.replace(/^Menunggu validasi operator\. /, ""),
    },
  });

  return Response.json({
    ok: true,
    alarmId: updated.code,
    state: "In Progress",
  });
}
