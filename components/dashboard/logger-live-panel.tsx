"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownIcon,
  ArrowLeftRightIcon,
  ArrowUpDownIcon,
  ClockIcon,
  MapPinIcon,
  PencilIcon,
  RadioTowerIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { LoggerDeviceParameters, LoggerGnssBaseline } from "@/lib/types";

function formatNumber(value: number | null, digits = 6) {
  return value == null ? "-" : value.toFixed(digits);
}

function formatDisplacement(value: number | null, unit: string) {
  if (value == null) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)} ${unit}`;
}

function BaselineRow({
  label,
  baseline,
  current,
  displacement,
  unit,
}: {
  label: string;
  baseline: number | null;
  current: number | null;
  displacement: number | null;
  unit: string;
}) {
  return (
    <div className="grid grid-cols-[60px_1fr_1fr_1fr] items-center gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums">{formatNumber(baseline)}</span>
      <span className="font-mono tabular-nums">{formatNumber(current)}</span>
      <span
        className={`font-mono font-medium tabular-nums ${
          displacement == null
            ? "text-muted-foreground"
            : displacement > 0
              ? "text-emerald-600"
              : displacement < 0
                ? "text-red-600"
                : "text-foreground"
        }`}
      >
        {formatDisplacement(displacement, unit)}
      </span>
    </div>
  );
}

type BaselineFormState = {
  baselineLatitude: string;
  baselineLongitude: string;
  baselineElevationM: string;
};

function baselineToForm(baseline: LoggerGnssBaseline): BaselineFormState {
  return {
    baselineLatitude:
      baseline.baselineLatitude != null ? String(baseline.baselineLatitude) : "",
    baselineLongitude:
      baseline.baselineLongitude != null
        ? String(baseline.baselineLongitude)
        : "",
    baselineElevationM:
      baseline.baselineElevationM != null
        ? String(baseline.baselineElevationM)
        : "",
  };
}

export function LoggerLivePanel({
  devices,
  title,
  description,
}: {
  devices: LoggerDeviceParameters[];
  title: string;
  description: string;
}) {
  const router = useRouter();
  const [editingDevice, setEditingDevice] =
    useState<LoggerDeviceParameters | null>(null);
  const [form, setForm] = useState<BaselineFormState>({
    baselineLatitude: "",
    baselineLongitude: "",
    baselineElevationM: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const devicesWithData = devices.filter(
    (d) => d.parameters.length > 0 || d.baseline != null,
  );

  function openEdit(device: LoggerDeviceParameters) {
    setEditingDevice(device);
    setForm(
      baselineToForm(
        device.baseline ?? {
          baselineLatitude: null,
          baselineLongitude: null,
          baselineElevationM: null,
          currentLatitude: null,
          currentLongitude: null,
          currentElevationM: null,
          displacementXmm: null,
          displacementYmm: null,
          displacementZcm: null,
        },
      ),
    );
    setMessage(null);
  }

  function closeEdit() {
    setEditingDevice(null);
    setMessage(null);
  }

  async function submitBaseline(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    if (!editingDevice) return;
    setSaving(true);
    setMessage(null);
    const payload: Record<string, unknown> = {
      deviceCode: editingDevice.deviceCode,
    };
    const lat = form.baselineLatitude.trim();
    const lon = form.baselineLongitude.trim();
    const alt = form.baselineElevationM.trim();
    if (lat !== "") payload.baselineLatitude = Number(lat);
    if (lon !== "") payload.baselineLongitude = Number(lon);
    if (alt !== "") payload.baselineElevationM = Number(alt);

    const response = await fetch("/api/loggers/baselines", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    setSaving(false);
    if (!response.ok) {
      setMessage(result.error ?? "Gagal menyimpan baseline.");
      return;
    }
    closeEdit();
    router.refresh();
  }

  async function useLatest() {
    if (!editingDevice) return;
    setSaving(true);
    setMessage(null);
    const response = await fetch("/api/loggers/baselines", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceCode: editingDevice.deviceCode,
        useLatestReading: true,
      }),
    });
    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    setSaving(false);
    if (!response.ok) {
      setMessage(result.error ?? "Gagal mengambil reading terakhir.");
      return;
    }
    closeEdit();
    router.refresh();
  }

  return (
    <Card className="interactive-card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {devicesWithData.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Belum ada data masuk dari logger GNSS. Aktifkan parameter di halaman
            Pengaturan setelah logger mengirim data pertama.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {devicesWithData.map((device) => {
              const visible = device.parameters.filter((p) => p.visible);
              const hasBaseline =
                device.baseline?.baselineLatitude != null ||
                device.baseline?.baselineLongitude != null ||
                device.baseline?.baselineElevationM != null;
              return (
                <article
                  key={device.deviceCode}
                  className="interactive-card rounded-lg border p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted">
                        <RadioTowerIcon className="size-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          {device.deviceName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {device.deviceCode}
                        </p>
                        {device.pointName ? (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPinIcon className="size-3" />
                            {device.pointName}
                            {device.area ? ` · ${device.area}` : ""}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline">
                        {visible.length}/{device.parameters.length}
                      </Badge>
                      {device.pointType === "GNSS" ? (
                        <Button
                          size="icon-sm"
                          variant="outline"
                          onClick={() => openEdit(device)}
                          title="Atur baseline GNSS"
                        >
                          <PencilIcon />
                          <span className="sr-only">Atur baseline</span>
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {device.lastDataAt ? (
                    <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <ClockIcon className="size-3" />
                      Data terakhir {device.lastDataAt}
                    </p>
                  ) : null}

                  {device.pointType === "GNSS" && device.baseline ? (
                    <div className="mt-3 rounded-md border bg-muted/30 p-2.5">
                      <div className="mb-1.5 grid grid-cols-[60px_1fr_1fr_1fr] gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                        <span></span>
                        <span>Baseline</span>
                        <span>Terkini</span>
                        <span>Pergeseran</span>
                      </div>
                      {hasBaseline ? (
                        <div className="space-y-1">
                          <BaselineRow
                            label="X (lon)"
                            baseline={device.baseline.baselineLongitude}
                            current={device.baseline.currentLongitude}
                            displacement={device.baseline.displacementXmm}
                            unit="mm"
                          />
                          <BaselineRow
                            label="Y (lat)"
                            baseline={device.baseline.baselineLatitude}
                            current={device.baseline.currentLatitude}
                            displacement={device.baseline.displacementYmm}
                            unit="mm"
                          />
                          <BaselineRow
                            label="Z (alt)"
                            baseline={device.baseline.baselineElevationM}
                            current={device.baseline.currentElevationM}
                            displacement={device.baseline.displacementZcm}
                            unit="cm"
                          />
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          Baseline belum di-set. Klik tombol pensil untuk mengatur.
                        </div>
                      )}
                    </div>
                  ) : null}

                  {visible.length > 0 ? (
                    <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs">
                      {visible.map((parameter) => (
                        <div
                          key={parameter.sensorKey}
                          className="interactive-tile rounded-md bg-muted/40 px-2 py-1.5"
                        >
                          <p className="truncate text-muted-foreground">
                            {parameter.label}
                          </p>
                          <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
                            {parameter.latestValue ?? "-"}
                            {parameter.unit && parameter.unit !== "-" ? (
                              <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                                {parameter.unit}
                              </span>
                            ) : null}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </CardContent>

      <Sheet
        open={editingDevice != null}
        onOpenChange={(open) => {
          if (!open) closeEdit();
        }}
      >
        <SheetContent className="overflow-y-auto sm:max-w-md">
          {editingDevice ? (
            <form onSubmit={submitBaseline}>
              <SheetHeader>
                <SheetTitle>Atur Baseline GNSS</SheetTitle>
                <SheetDescription>
                  {editingDevice.deviceName} · {editingDevice.deviceCode}
                  {editingDevice.pointName
                    ? ` → ${editingDevice.pointName}`
                    : ""}
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-4 px-4 py-2">
                {message ? (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {message}
                  </div>
                ) : null}

                {editingDevice.baseline ? (
                  <div className="rounded-md border bg-muted/30 p-3 text-xs">
                    <p className="mb-1.5 font-medium">Reading terkini</p>
                    <div className="grid grid-cols-3 gap-2 text-muted-foreground">
                      <span>
                        Lat:{" "}
                        <span className="font-mono text-foreground">
                          {formatNumber(editingDevice.baseline.currentLatitude)}
                        </span>
                      </span>
                      <span>
                        Lon:{" "}
                        <span className="font-mono text-foreground">
                          {formatNumber(editingDevice.baseline.currentLongitude)}
                        </span>
                      </span>
                      <span>
                        Alt:{" "}
                        <span className="font-mono text-foreground">
                          {formatNumber(
                            editingDevice.baseline.currentElevationM,
                            2,
                          )}
                        </span>
                      </span>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-2">
                  <Label htmlFor="baseline-lat">
                    <ArrowUpDownIcon className="size-3.5" />
                    Y / Baseline Latitude (deg)
                  </Label>
                  <Input
                    id="baseline-lat"
                    type="number"
                    step="any"
                    placeholder="-7.774325"
                    value={form.baselineLatitude}
                    onChange={(event) =>
                      setForm((f) => ({
                        ...f,
                        baselineLatitude: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="baseline-lon">
                    <ArrowLeftRightIcon className="size-3.5" />
                    X / Baseline Longitude (deg)
                  </Label>
                  <Input
                    id="baseline-lon"
                    type="number"
                    step="any"
                    placeholder="110.449829"
                    value={form.baselineLongitude}
                    onChange={(event) =>
                      setForm((f) => ({
                        ...f,
                        baselineLongitude: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="baseline-alt">
                    <ArrowDownIcon className="size-3.5" />
                    Z / Baseline Altitude (m)
                  </Label>
                  <Input
                    id="baseline-alt"
                    type="number"
                    step="any"
                    placeholder="148.55"
                    value={form.baselineElevationM}
                    onChange={(event) =>
                      setForm((f) => ({
                        ...f,
                        baselineElevationM: event.target.value,
                      }))
                    }
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Kosongkan field untuk tidak mengubah baseline tersebut. Tombol
                  &quot;Gunakan reading terkini&quot; akan mengisi ketiganya dari
                  payload logger terakhir.
                </p>
              </div>
              <SheetFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={useLatest}
                  disabled={saving}
                >
                  Gunakan reading terkini
                </Button>
                <Button type="submit" disabled={saving}>
                  Simpan
                </Button>
              </SheetFooter>
            </form>
          ) : null}
        </SheetContent>
      </Sheet>
    </Card>
  );
}
