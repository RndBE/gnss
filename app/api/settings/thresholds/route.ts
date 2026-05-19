import { z } from "zod";

import { getThresholdSettings } from "@/lib/backend/queries";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const thresholdSchema = z.object({
  id: z.string().min(1),
  metric: z.string().min(1).optional(),
  normal: z.string().min(1).optional(),
  waspada: z.string().min(1).optional(),
  siaga: z.string().min(1).optional(),
  awas: z.string().min(1).optional(),
});

export async function GET() {
  const thresholds = await getThresholdSettings();

  return Response.json({
    thresholds,
  });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = thresholdSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Payload threshold tidak valid.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.threshold.findUnique({
    where: { id: parsed.data.id },
  });

  if (!existing) {
    return Response.json({ error: "Threshold tidak ditemukan." }, { status: 404 });
  }

  const threshold = await prisma.threshold.update({
    where: { id: parsed.data.id },
    data: {
      metric: parsed.data.metric,
      normal: parsed.data.normal,
      waspada: parsed.data.waspada,
      siaga: parsed.data.siaga,
      awas: parsed.data.awas,
    },
  });

  return Response.json({
    ok: true,
    threshold,
  });
}
