"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, Edit3, Save } from "lucide-react";
import { useRouter } from "next/navigation";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AlarmThresholdSetting } from "@/lib/types";

type ThresholdDraft = {
  normal: string;
  waspada: string;
  siaga: string;
  awas: string;
};

type AlarmThresholdManagerProps = {
  thresholds: AlarmThresholdSetting[];
};

function toDraft(setting: AlarmThresholdSetting): ThresholdDraft {
  return {
    normal: String(setting.normal),
    waspada: String(setting.waspada),
    siaga: String(setting.siaga),
    awas: String(setting.awas),
  };
}

function toNumber(value: string) {
  return Number(value.replace(",", "."));
}

function formatThresholdValue(value: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function AlarmThresholdManager({ thresholds }: AlarmThresholdManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmSave, setConfirmSave] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, ThresholdDraft>>(() =>
    Object.fromEntries(thresholds.map((setting) => [setting.id, toDraft(setting)])),
  );

  const awlrCount = useMemo(
    () => thresholds.filter((setting) => setting.pointType === "AWLR").length,
    [thresholds],
  );
  const editingSetting = thresholds.find((setting) => setting.id === editingId);

  function updateDraft(id: string, key: keyof ThresholdDraft, value: string) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        [key]: value,
      },
    }));
    setConfirmSave(false);
  }

  function openEditor(setting: AlarmThresholdSetting) {
    setDrafts((current) => ({
      ...current,
      [setting.id]: toDraft(setting),
    }));
    setMessage(null);
    setConfirmSave(false);
    setEditingId(setting.id);
  }

  function closeEditor(open: boolean) {
    if (open) return;
    if (savingId) return;
    setEditingId(null);
    setConfirmSave(false);
  }

  function validateDraft(setting: AlarmThresholdSetting) {
    const draft = drafts[setting.id] ?? toDraft(setting);
    const values = {
      normal: toNumber(draft.normal),
      waspada: toNumber(draft.waspada),
      siaga: toNumber(draft.siaga),
      awas: toNumber(draft.awas),
    };

    if (Object.values(values).some((value) => Number.isNaN(value))) {
      return { error: "Nilai threshold harus berupa angka.", values };
    }

    if (
      !(
        values.normal <= values.waspada &&
        values.waspada <= values.siaga &&
        values.siaga <= values.awas
      )
    ) {
      return {
        error: "Urutan harus normal <= waspada <= siaga <= awas.",
        values,
      };
    }

    return { error: null, values };
  }

  function requestSaveConfirmation(setting: AlarmThresholdSetting) {
    const result = validateDraft(setting);

    if (result.error) {
      setMessage(result.error);
      setConfirmSave(false);
      return;
    }

    setMessage(null);
    setConfirmSave(true);
  }

  async function saveThreshold(setting: AlarmThresholdSetting) {
    const result = validateDraft(setting);

    if (result.error) {
      setMessage(result.error);
      return;
    }

    setSavingId(setting.id);
    setMessage(null);

    const response = await fetch("/api/alarm-thresholds", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: setting.id,
        pointId: setting.pointId,
        parameter: setting.parameter,
        unit: setting.unit,
        ...result.values,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    setSavingId(null);

    if (!response.ok) {
      setMessage(payload.error ?? "Threshold gagal disimpan.");
      setConfirmSave(false);
      return;
    }

    setMessage(
      payload.sync
        ? `Threshold tersimpan. Status ${setting.pointName}: ${payload.sync.status}.`
        : "Threshold tersimpan.",
    );
    setConfirmSave(false);
    setEditingId(null);
    startTransition(() => router.refresh());
  }

  return (
    <Card className="interactive-card">
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Threshold Alarm Per Pos</CardTitle>
            <CardDescription>
              Ambang per pos dipakai untuk status Waspada, Siaga, Awas, dan alarm operasional.
            </CardDescription>
          </div>
          <Badge variant="outline">{awlrCount} AWLR</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="min-w-[220px]">Pos</TableHead>
                <TableHead>Parameter</TableHead>
                <TableHead className="min-w-[110px]">Normal</TableHead>
                <TableHead className="min-w-[110px]">Waspada</TableHead>
                <TableHead className="min-w-[110px]">Siaga</TableHead>
                <TableHead className="min-w-[110px]">Awas</TableHead>
                <TableHead className="min-w-[90px]">Unit</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {thresholds.map((setting) => (
                  <TableRow key={setting.id}>
                    <TableCell>
                      <div className="font-medium">{setting.pointName}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{setting.pointType}</Badge>
                        {setting.area}
                      </div>
                    </TableCell>
                    <TableCell>{setting.parameter}</TableCell>
                    <TableCell>{formatThresholdValue(setting.normal)}</TableCell>
                    <TableCell>{formatThresholdValue(setting.waspada)}</TableCell>
                    <TableCell>{formatThresholdValue(setting.siaga)}</TableCell>
                    <TableCell>{formatThresholdValue(setting.awas)}</TableCell>
                    <TableCell>{setting.unit}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditor(setting)}
                      >
                        <Edit3 />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
        {message ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground">{message}</p>
        ) : null}
      </CardContent>
      <Sheet open={Boolean(editingSetting)} onOpenChange={closeEditor}>
        <SheetContent className="sm:max-w-md">
          {editingSetting ? (
            <>
              <SheetHeader>
                <SheetTitle>Edit Threshold Alarm</SheetTitle>
                <SheetDescription>
                  {editingSetting.pointName} - {editingSetting.parameter}
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-4 px-4">
                <div className="interactive-tile rounded-lg border bg-muted/30 p-3">
                  <div className="font-medium">{editingSetting.pointName}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{editingSetting.pointType}</Badge>
                    {editingSetting.area}
                    <span>{editingSetting.unit}</span>
                  </div>
                </div>
                {(["normal", "waspada", "siaga", "awas"] as const).map((key) => (
                  <div className="grid gap-2" key={key}>
                    <Label className="capitalize" htmlFor={`${editingSetting.id}-${key}`}>
                      {key}
                    </Label>
                    <Input
                      id={`${editingSetting.id}-${key}`}
                      inputMode="decimal"
                      step="0.01"
                      type="number"
                      value={(drafts[editingSetting.id] ?? toDraft(editingSetting))[key]}
                      onChange={(event) =>
                        updateDraft(editingSetting.id, key, event.target.value)
                      }
                    />
                  </div>
                ))}
                {confirmSave ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <div className="flex items-start gap-2 font-medium">
                      <AlertTriangle className="mt-0.5 size-4" />
                      Konfirmasi perubahan threshold
                    </div>
                    <p className="mt-2 text-xs leading-5">
                      Perubahan ini akan mempengaruhi status risiko dan alarm untuk{" "}
                      {editingSetting.pointName}.
                    </p>
                    <div className="mt-3 flex justify-end gap-2">
                      <Button
                        disabled={savingId === editingSetting.id || isPending}
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmSave(false)}
                      >
                        Batal
                      </Button>
                      <Button
                        disabled={savingId === editingSetting.id || isPending}
                        size="sm"
                        onClick={() => saveThreshold(editingSetting)}
                      >
                        <Save />
                        Ya, Simpan
                      </Button>
                    </div>
                  </div>
                ) : null}
                {message ? (
                  <p className="text-sm text-muted-foreground">{message}</p>
                ) : null}
              </div>
              <SheetFooter>
                <Button
                  disabled={savingId === editingSetting.id || isPending}
                  onClick={() => requestSaveConfirmation(editingSetting)}
                >
                  <Save />
                  Simpan Perubahan
                </Button>
                <Button
                  disabled={savingId === editingSetting.id}
                  variant="outline"
                  onClick={() => closeEditor(false)}
                >
                  Tutup
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </Card>
  );
}
