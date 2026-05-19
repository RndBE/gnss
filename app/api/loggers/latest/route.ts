import { getDataLoggerFeeds } from "@/lib/backend/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const loggers = await getDataLoggerFeeds();

  return Response.json({
    intervalSeconds: 60,
    loggers,
  });
}
