import { getAwlrMonitoringData } from "@/lib/backend/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const data = await getAwlrMonitoringData({
    stationId: searchParams.get("pos"),
    parameter: searchParams.get("parameter"),
    range: searchParams.get("range"),
    dateFrom: searchParams.get("from"),
    dateTo: searchParams.get("to"),
    granularity: searchParams.get("granularity"),
  });

  return Response.json(data);
}
