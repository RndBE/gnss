import { getMonitoringPoints } from "@/lib/backend/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const points = await getMonitoringPoints();

  return Response.json({
    points,
    layers: [
      "Titik GNSS",
      "Titik AWLR/Tide",
      "Titik CCTV",
      "Zona Risiko Rob",
      "Zona Penurunan Tanah",
      "Infrastruktur Penting",
      "Batas Administrasi",
    ],
  });
}
