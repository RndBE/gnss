import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type GnssPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function GnssPage({ searchParams }: GnssPageProps) {
  const params = await searchParams;
  const next = new URLSearchParams();
  next.set("sensor", "gnss");
  next.set("parameter", firstParam(params.parameter) ?? "z");
  next.set("range", firstParam(params.range) ?? "180d");

  const stationId = firstParam(params.pos);
  if (stationId) next.set("pos", stationId);

  redirect(`/analisa-data?${next.toString()}`);
}
