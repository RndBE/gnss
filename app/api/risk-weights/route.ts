import { z } from "zod";

import { getRiskWeights } from "@/lib/backend/queries";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const riskWeightSchema = z.object({
  id: z.string().min(1).optional(),
  metric: z.string().min(3),
  source: z.string().min(2),
  weight: z.coerce.number().int().min(0).max(100),
});

const deleteSchema = z.object({
  id: z.string().min(1),
});

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function createUniqueId(metric: string) {
  const base = slugify(metric) || "risk-weight";
  let id = base;
  let suffix = 2;

  while (await prisma.riskWeight.findUnique({ where: { id } })) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }

  return id;
}

export async function GET() {
  const weights = await getRiskWeights();

  return Response.json({ weights });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = riskWeightSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        error: "Payload bobot risiko tidak valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const weight = await prisma.riskWeight.create({
    data: {
      id: parsed.data.id ?? (await createUniqueId(parsed.data.metric)),
      metric: parsed.data.metric,
      source: parsed.data.source,
      weight: parsed.data.weight,
    },
  });

  return Response.json({ ok: true, weight }, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = riskWeightSchema.extend({ id: z.string().min(1) }).safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        error: "Payload bobot risiko tidak valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const existing = await prisma.riskWeight.findUnique({
    where: { id: parsed.data.id },
  });

  if (!existing) {
    return Response.json({ error: "Komponen skor tidak ditemukan." }, { status: 404 });
  }

  const weight = await prisma.riskWeight.update({
    where: { id: parsed.data.id },
    data: {
      metric: parsed.data.metric,
      source: parsed.data.source,
      weight: parsed.data.weight,
    },
  });

  return Response.json({ ok: true, weight });
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = deleteSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        error: "Payload hapus komponen skor tidak valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const existing = await prisma.riskWeight.findUnique({
    where: { id: parsed.data.id },
  });

  if (!existing) {
    return Response.json({ error: "Komponen skor tidak ditemukan." }, { status: 404 });
  }

  await prisma.riskWeight.delete({
    where: { id: parsed.data.id },
  });

  return Response.json({ ok: true });
}
