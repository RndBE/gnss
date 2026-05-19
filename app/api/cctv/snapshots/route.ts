import { getCctvSnapshots } from "@/lib/backend/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshots = await getCctvSnapshots();

  return Response.json({
    snapshots,
    visualAi: [
      "Deteksi genangan",
      "Deteksi jalan tertutup",
      "Deteksi kerusakan visual",
      "Deteksi kondisi kamera",
    ],
  });
}
