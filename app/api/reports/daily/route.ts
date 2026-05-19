import { getRiskAreas } from "@/lib/backend/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const riskAreas = await getRiskAreas();
  const headers = [
    "area",
    "status",
    "score",
    "subsidence_rate",
    "water_level",
    "next_window",
  ];

  const rows = riskAreas.map((area) => [
    area.area,
    area.status,
    area.score.toString(),
    area.subsidenceRate,
    area.waterLevel,
    area.nextWindow,
  ]);

  const csv = [headers, ...rows]
    .map((row) =>
      row
        .map((value) => `"${value.replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");

  return new Response(csv, {
    headers: {
      "Content-Disposition": 'attachment; filename="laporan-harian-pesisir.csv"',
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
