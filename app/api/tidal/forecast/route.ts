import { NextRequest, NextResponse } from "next/server";
import { forecastTidal } from "@/lib/tidal-inference";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const horizonHours = Number(searchParams.get("horizon") ?? 72);
  const lat = Number(searchParams.get("lat") ?? -7.8);
  const lon = Number(searchParams.get("lon") ?? 110.0);

  if (![6, 72].includes(horizonHours)) {
    return NextResponse.json(
      { error: "horizon harus 6 atau 72" },
      { status: 400 }
    );
  }
  if (lat < -90 || lat > 90) {
    return NextResponse.json({ error: "lat tidak valid" }, { status: 400 });
  }
  if (lon < -180 || lon > 180) {
    return NextResponse.json({ error: "lon tidak valid" }, { status: 400 });
  }

  const result = await forecastTidal({ horizonHours, lat, lon });
  return NextResponse.json(result);
}
