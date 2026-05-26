import { CalendarIcon, DatabaseIcon, MapPinIcon } from "lucide-react";

import { AppShell } from "@/components/dashboard/app-shell";
import { DataMasukFilterBar } from "@/components/dashboard/data-masuk-filter-bar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getDashboardSummary,
  getLoggerDevicePickerOptions,
  getLoggerReadingsForDay,
} from "@/lib/backend/queries";

export const dynamic = "force-dynamic";

type DataMasukPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDateLabel(iso: string) {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dt);
}

export default async function DataMasukPage({
  searchParams,
}: DataMasukPageProps) {
  const params = await searchParams;
  const requestedDevice = firstParam(params.device) ?? null;
  const requestedDate = firstParam(params.date) ?? null;

  const [summary, devices] = await Promise.all([
    getDashboardSummary(),
    getLoggerDevicePickerOptions(),
  ]);

  const selectedDevice =
    devices.find((d) => d.deviceCode === requestedDevice) ?? devices[0] ?? null;

  const day = selectedDevice
    ? await getLoggerReadingsForDay(selectedDevice.deviceCode, requestedDate)
    : null;

  return (
    <AppShell
      activeArea={summary.activeArea}
      activePath="/data-masuk"
      title="Data Masuk Logger"
      updatedAt={summary.updatedAt}
    >
      <div className="grid gap-4">
        <DataMasukFilterBar
          devices={devices}
          selectedDeviceCode={selectedDevice?.deviceCode ?? null}
          selectedDate={day?.date ?? requestedDate}
          availableDates={day?.availableDates ?? []}
        />

        {devices.length === 0 ? (
          <Card className="interactive-card">
            <CardContent className="p-6">
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Belum ada logger yang pernah mengirim data. Jalankan POST
                <code className="mx-1">/api/loggers/ingest</code> untuk
                memulai.
              </div>
            </CardContent>
          </Card>
        ) : !day ? (
          <Card className="interactive-card">
            <CardContent className="p-6">
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Pilih logger di atas untuk menampilkan data masuk.
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="interactive-card">
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <DatabaseIcon className="size-4 text-muted-foreground" />
                    {day.deviceName}
                    <span className="text-xs font-normal text-muted-foreground">
                      ({day.deviceCode})
                    </span>
                  </CardTitle>
                  <CardDescription className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {day.pointName ? (
                      <span className="flex items-center gap-1">
                        <MapPinIcon className="size-3.5" />
                        {day.pointName}
                        {day.area ? ` · ${day.area}` : ""}
                      </span>
                    ) : (
                      <span>Belum terhubung ke pos</span>
                    )}
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="size-3.5" />
                      {formatDateLabel(day.date)}
                    </span>
                  </CardDescription>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs sm:flex sm:flex-row">
                  <div className="rounded-md border bg-muted/40 px-3 py-1.5">
                    <p className="text-muted-foreground">Reading hari ini</p>
                    <p className="font-semibold tabular-nums">
                      {day.totalForDay}
                    </p>
                  </div>
                  <div className="rounded-md border bg-muted/40 px-3 py-1.5">
                    <p className="text-muted-foreground">Total semua hari</p>
                    <p className="font-semibold tabular-nums">{day.totalAll}</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {day.rows.length === 0 ? (
                <div className="border-t px-6 py-8 text-sm text-muted-foreground">
                  Tidak ada data masuk untuk tanggal ini.
                  {day.availableDates.length > 0 ? (
                    <>
                      {" "}Coba pilih tanggal lain (tersedia:{" "}
                      {day.availableDates.slice(0, 5).join(", ")}
                      {day.availableDates.length > 5
                        ? `, dst (+${day.availableDates.length - 5})`
                        : ""}
                      ).
                    </>
                  ) : null}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="sticky left-0 z-10 bg-muted/40 whitespace-nowrap">
                          Waktu
                        </TableHead>
                        {day.parameters.map((p) => (
                          <TableHead key={p.sensorKey} className="whitespace-nowrap">
                            <span>{p.label}</span>
                            {p.unit && p.unit !== "-" ? (
                              <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                                ({p.unit})
                              </span>
                            ) : null}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {day.rows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="sticky left-0 bg-background font-medium tabular-nums whitespace-nowrap">
                            {row.recordedAtLabel}
                          </TableCell>
                          {day.parameters.map((p) => (
                            <TableCell
                              key={p.sensorKey}
                              className="font-mono text-xs tabular-nums"
                            >
                              {row.values[p.sensorKey] ?? "-"}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
