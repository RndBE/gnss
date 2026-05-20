import {
  getAlarmEvents,
  getDataLoggerFeeds,
  getRiskAreas,
} from "@/lib/backend/queries";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ReportDownloadContext = {
  params: Promise<{ id: string }>;
};

type ReportFormat = "csv" | "excel" | "json" | "pdf";

const formatLabels: Record<ReportFormat, string> = {
  csv: "CSV",
  excel: "Excel",
  json: "JSON",
  pdf: "PDF",
};

function normalizeFormat(value: string | null): ReportFormat {
  if (value === "csv" || value === "excel" || value === "json") return value;
  return "pdf";
}

function templateFormats(value: unknown) {
  return Array.isArray(value)
    ? value.filter((format): format is string => typeof format === "string")
    : [];
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatReportDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: "Asia/Jakarta",
    year: "numeric",
  })
    .format(date)
    .replace("pukul ", "")
    .replace(":", ".");
}

function escapeCsv(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function csvResponse(filename: string, rows: string[][], excel = false) {
  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}.${excel ? "xls" : "csv"}"`,
      "Content-Type": excel
        ? "application/vnd.ms-excel; charset=utf-8"
        : "text/csv; charset=utf-8",
    },
  });
}

function escapePdfText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

function wrapLine(value: string, maxLength = 92) {
  if (value.length <= maxLength) return [value];

  const words = value.split(" ");
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;

    if (next.length > maxLength) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function buildPdf(title: string, lines: string[]) {
  const visibleLines = lines.flatMap((line) =>
    line ? wrapLine(line) : [""],
  ).slice(0, 52);
  const content = [
    "BT",
    "/F2 16 Tf",
    "72 790 Td",
    `(${escapePdfText(title)}) Tj`,
    "/F1 10 Tf",
    "0 -24 Td",
    ...visibleLines.flatMap((line) => [
      `(${escapePdfText(line)}) Tj`,
      "0 -14 Td",
    ]),
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  const encoder = new TextEncoder();
  const offsets = [0];
  let pdf = "%PDF-1.4\n";

  for (const [index, object] of objects.entries()) {
    offsets.push(encoder.encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }

  const xrefOffset = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  pdf += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return encoder.encode(pdf);
}

async function buildReportRows(report: {
  areaName: string;
  generatedAt: Date;
  template: { name: string; period: string };
}) {
  const [riskAreas, alarms, loggers] = await Promise.all([
    getRiskAreas(),
    getAlarmEvents(),
    getDataLoggerFeeds(),
  ]);
  const scopedRiskAreas =
    report.areaName === "Pantura Jawa Tengah"
      ? riskAreas
      : riskAreas.filter((area) => area.area === report.areaName);
  const scopedAlarms =
    report.areaName === "Pantura Jawa Tengah"
      ? alarms
      : alarms.filter((alarm) => alarm.area === report.areaName);

  const rows = [
    ["section", "area", "status", "metric", "value", "note"],
    ...scopedRiskAreas.map((area) => [
      "risk",
      area.area,
      area.status,
      "score",
      String(area.score),
      `Penurunan ${area.subsidenceRate}; muka air ${area.waterLevel}; jam rawan ${area.nextWindow}`,
    ]),
    ...scopedAlarms.map((alarm) => [
      "alarm",
      alarm.area,
      alarm.status,
      alarm.type,
      alarm.state,
      `${alarm.time} - ${alarm.message}`,
    ]),
    ...loggers.map((logger) => [
      "logger",
      logger.area,
      logger.status,
      logger.name,
      logger.parameters.map((parameter) => `${parameter.label}: ${parameter.value}`).join("; "),
      `Update ${logger.lastData}`,
    ]),
  ];
  const lines = [
    `Template: ${report.template.name}`,
    `Periode: ${report.template.period}`,
    `Area: ${report.areaName}`,
    `Dibuat: ${formatReportDate(report.generatedAt)}`,
    "",
    "Ringkasan Risiko",
    ...scopedRiskAreas.map(
      (area) =>
        `- ${area.area}: ${area.status}, skor ${area.score}, penurunan ${area.subsidenceRate}, muka air ${area.waterLevel}, jam rawan ${area.nextWindow}`,
    ),
    "",
    "Alarm dan Event",
    ...(scopedAlarms.length
      ? scopedAlarms.map(
          (alarm) =>
            `- ${alarm.type} (${alarm.area}): ${alarm.status}, ${alarm.state}, ${alarm.time}. ${alarm.message}`,
        )
      : ["- Tidak ada alarm untuk area ini."]),
    "",
    "Logger Terpantau",
    ...loggers
      .slice(0, 12)
      .map(
        (logger) =>
          `- ${logger.name} (${logger.area}): ${logger.status}, ${logger.parameters
            .map((parameter) => `${parameter.label} ${parameter.value}`)
            .join(", ")}, update ${logger.lastData}`,
      ),
  ];

  return { lines, rows };
}

export async function GET(request: Request, context: ReportDownloadContext) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const format = normalizeFormat(url.searchParams.get("format"));
  const label = formatLabels[format];
  const report = await prisma.report.findUnique({
    include: { template: true },
    where: { id },
  });

  if (!report) {
    return Response.json({ error: "Laporan tidak ditemukan." }, { status: 404 });
  }

  if (report.status !== "READY") {
    return Response.json(
      { error: "Laporan belum siap diunduh." },
      { status: 409 },
    );
  }

  const formats = templateFormats(report.template.formats);

  if (!formats.includes(label)) {
    return Response.json(
      { error: `Template ini tidak menyediakan format ${label}.` },
      { status: 400 },
    );
  }

  const filename = slugify(`${report.template.name}-${report.areaName}`);
  const { lines, rows } = await buildReportRows(report);

  if (format === "json") {
    return Response.json(
      {
        id: report.id,
        template: report.template.name,
        area: report.areaName,
        generatedAt: report.generatedAt,
        rows: rows.slice(1),
      },
      {
        headers: {
          "Content-Disposition": `attachment; filename="${filename}.json"`,
        },
      },
    );
  }

  if (format === "csv" || format === "excel") {
    return csvResponse(filename, rows, format === "excel");
  }

  const pdf = buildPdf(report.template.name, lines);

  return new Response(pdf, {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      "Content-Type": "application/pdf",
    },
  });
}
