"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, EyeIcon, EyeOffIcon, RadioTowerIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LoggerDeviceParameters } from "@/lib/types";

export function LoggerParameterSettings({
  devices,
}: {
  devices: LoggerDeviceParameters[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function toggleVisibility(
    deviceCode: string,
    sensorKey: string,
    nextVisible: boolean,
  ) {
    const id = `${deviceCode}:${sensorKey}`;
    setPending(id);
    setMessage(null);
    try {
      const response = await fetch("/api/loggers/parameters", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceCode,
          sensorKey,
          visible: nextVisible,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setMessage(payload.error ?? "Gagal memperbarui parameter.");
        return;
      }
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  if (devices.length === 0) {
    return (
      <Card className="interactive-card">
        <CardHeader>
          <CardTitle>Parameter Logger GNSS</CardTitle>
          <CardDescription>
            Pilih parameter yang ditampilkan di halaman perangkat dan analisa data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Belum ada perangkat GNSS yang pernah mengirim data. Pastikan logger
            sudah mengirim payload ke <code>/api/loggers/ingest</code>.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="interactive-card">
      <CardHeader>
        <CardTitle>Parameter Logger GNSS</CardTitle>
        <CardDescription>
          Centang parameter yang ingin ditampilkan. Parameter terdaftar otomatis
          saat logger mengirim data baru.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {message}
          </div>
        ) : null}
        {devices.map((device) => {
          const visibleCount = device.parameters.filter((p) => p.visible).length;
          return (
            <div
              key={device.deviceCode}
              className="rounded-lg border bg-card"
            >
              <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted">
                    <RadioTowerIcon className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{device.deviceName}</p>
                    <p className="text-xs text-muted-foreground">
                      {device.deviceCode} · {device.pointName ?? "Belum diatur"}
                      {device.area ? ` · ${device.area}` : ""}
                    </p>
                    {device.lastDataAt ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Data terakhir {device.lastDataAt}
                      </p>
                    ) : null}
                  </div>
                </div>
                <Badge variant="outline" className="self-start sm:self-auto">
                  {visibleCount}/{device.parameters.length} tampil
                </Badge>
              </div>
              {device.parameters.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  Belum ada parameter terdeteksi untuk perangkat ini.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="w-16">Tampil</TableHead>
                      <TableHead>Parameter</TableHead>
                      <TableHead>Sensor</TableHead>
                      <TableHead>Nilai Terkini</TableHead>
                      <TableHead>Satuan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {device.parameters.map((parameter) => {
                      const id = `${parameter.deviceCode}:${parameter.sensorKey}`;
                      const busy = pending === id;
                      return (
                        <TableRow key={id}>
                          <TableCell>
                            <label className="flex items-center gap-2">
                              <Checkbox
                                checked={parameter.visible}
                                disabled={busy}
                                onCheckedChange={(next) => {
                                  toggleVisibility(
                                    parameter.deviceCode,
                                    parameter.sensorKey,
                                    Boolean(next),
                                  );
                                }}
                              />
                              {parameter.visible ? (
                                <EyeIcon className="size-3.5 text-emerald-600" />
                              ) : (
                                <EyeOffIcon className="size-3.5 text-muted-foreground" />
                              )}
                            </label>
                          </TableCell>
                          <TableCell className="font-medium">
                            {parameter.label}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {parameter.sensorKey}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {parameter.latestValue ?? "-"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {parameter.unit}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          );
        })}
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckIcon className="size-3.5" />
          Perubahan tersimpan otomatis dan langsung memengaruhi tampilan di
          halaman Perangkat dan Analisa Data.
        </p>
      </CardContent>
    </Card>
  );
}
