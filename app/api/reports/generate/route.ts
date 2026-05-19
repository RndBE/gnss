import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const reportGenerateSchema = z.object({
  templateId: z.string().min(1).default("daily"),
  areaName: z.string().min(1).default("Pantura Jawa Tengah"),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = reportGenerateSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Payload laporan tidak valid.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const template = await prisma.reportTemplate.findUnique({
    where: { id: parsed.data.templateId },
  });

  if (!template) {
    return Response.json({ error: "Template laporan tidak ditemukan." }, { status: 404 });
  }

  const report = await prisma.report.create({
    data: {
      templateId: template.id,
      areaName: parsed.data.areaName,
      status: "READY",
      downloadUrl: "/api/reports/daily",
    },
  });

  return Response.json({
    ok: true,
    report: {
      id: report.id,
      template: template.name,
      area: report.areaName,
      generatedAt: report.generatedAt,
      status: report.status,
      downloadUrl: report.downloadUrl,
    },
  });
}
