import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const resolveSchema = z.object({
  alarmId: z.string().min(1),
  note: z.string().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = resolveSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Payload resolve alarm tidak valid.", issues: parsed.error.flatten() },
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
      state: "RESOLVED",
      resolvedAt: new Date(),
      resolutionNote: parsed.data.note,
    },
  });

  return Response.json({
    ok: true,
    alarmId: updated.code,
    note: updated.resolutionNote ?? "",
    state: "Resolved",
  });
}
