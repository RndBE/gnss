import { getDashboardSummary } from "@/lib/backend/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const summary = await getDashboardSummary();
  return Response.json(summary);
}
