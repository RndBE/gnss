import {
  getDeviceTelemetry,
  getMaintenanceLogs,
} from "@/lib/backend/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const [devices, maintenanceLogs] = await Promise.all([
    getDeviceTelemetry(),
    getMaintenanceLogs(),
  ]);

  return Response.json({
    devices,
    maintenanceLogs,
  });
}
