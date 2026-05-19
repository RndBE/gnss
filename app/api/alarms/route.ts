import { getAlarmEvents } from "@/lib/backend/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const alarms = await getAlarmEvents();

  return Response.json({
    alarms,
  });
}
