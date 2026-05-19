"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RiskWeightSetting } from "@/lib/types";

type RiskWeightManagerProps = {
  weights: RiskWeightSetting[];
};

type Draft = {
  metric: string;
  source: string;
  weight: string;
};

const emptyDraft: Draft = {
  metric: "",
  source: "",
  weight: "",
};

async function submitRiskWeight(
  method: "POST" | "PUT" | "DELETE",
  payload: unknown,
) {
  const response = await fetch("/api/risk-weights", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error ?? "Gagal menyimpan komponen skor.");
  }

  return data;
}

export function RiskWeightManager({ weights }: RiskWeightManagerProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const totalWeight = useMemo(
    () => weights.reduce((total, item) => total + item.weight, 0),
    [weights],
  );

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingId("create");

    try {
      await submitRiskWeight("POST", {
        metric: draft.metric,
        source: draft.source,
        weight: Number(draft.weight),
      });
      toast.success("Komponen skor ditambahkan");
      setDraft(emptyDraft);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menambah komponen skor");
    } finally {
      setPendingId(null);
    }
  }

  async function handleUpdate(id: string) {
    setPendingId(id);

    try {
      await submitRiskWeight("PUT", {
        id,
        metric: editDraft.metric,
        source: editDraft.source,
        weight: Number(editDraft.weight),
      });
      toast.success("Komponen skor diperbarui");
      setEditingId(null);
      setEditDraft(emptyDraft);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui komponen skor");
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete(id: string) {
    setPendingId(id);

    try {
      await submitRiskWeight("DELETE", { id });
      toast.success("Komponen skor dihapus");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus komponen skor");
    } finally {
      setPendingId(null);
    }
  }

  function startEdit(item: RiskWeightSetting) {
    setEditingId(item.id);
    setEditDraft({
      metric: item.metric,
      source: item.source,
      weight: String(item.weight),
    });
  }

  return (
    <Card className="interactive-card">
      <CardHeader>
        <div>
          <CardTitle>Komponen Skor</CardTitle>
          <CardDescription>
            CRUD bobot rule-based untuk analisis risiko rob
          </CardDescription>
        </div>
        <CardAction className="text-sm font-semibold tabular-nums">
          Total {totalWeight}%
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="interactive-tile grid gap-3 rounded-lg border bg-muted/20 p-3 md:grid-cols-[minmax(0,1fr)_180px_100px_auto]" onSubmit={handleCreate}>
          <div className="space-y-1.5">
            <Label htmlFor="risk-metric">Parameter</Label>
            <Input
              id="risk-metric"
              placeholder="Contoh: Riwayat rob"
              value={draft.metric}
              onChange={(event) =>
                setDraft((current) => ({ ...current, metric: event.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="risk-source">Sumber</Label>
            <Input
              id="risk-source"
              placeholder="Event historis"
              value={draft.source}
              onChange={(event) =>
                setDraft((current) => ({ ...current, source: event.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="risk-weight">Bobot</Label>
            <Input
              id="risk-weight"
              min={0}
              max={100}
              placeholder="%"
              type="number"
              value={draft.weight}
              onChange={(event) =>
                setDraft((current) => ({ ...current, weight: event.target.value }))
              }
              required
            />
          </div>
          <div className="flex items-end">
            <Button className="w-full" disabled={pendingId === "create"} type="submit">
              <Plus />
              Tambah
            </Button>
          </div>
        </form>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parameter</TableHead>
                <TableHead>Sumber</TableHead>
                <TableHead className="w-[210px]">Bobot</TableHead>
                <TableHead className="w-[120px] text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weights.map((item) => {
                const isEditing = editingId === item.id;

                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editDraft.metric}
                          onChange={(event) =>
                            setEditDraft((current) => ({
                              ...current,
                              metric: event.target.value,
                            }))
                          }
                        />
                      ) : (
                        <div className="font-medium">{item.metric}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editDraft.source}
                          onChange={(event) =>
                            setEditDraft((current) => ({
                              ...current,
                              source: event.target.value,
                            }))
                          }
                        />
                      ) : (
                        <span className="text-muted-foreground">{item.source}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          className="w-24"
                          min={0}
                          max={100}
                          type="number"
                          value={editDraft.weight}
                          onChange={(event) =>
                            setEditDraft((current) => ({
                              ...current,
                              weight: event.target.value,
                            }))
                          }
                        />
                      ) : (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span>{item.weight}%</span>
                          </div>
                          <Progress value={item.weight} />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {isEditing ? (
                          <>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              disabled={pendingId === item.id}
                              onClick={() => handleUpdate(item.id)}
                            >
                              <Check />
                              <span className="sr-only">Simpan</span>
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingId(null);
                                setEditDraft(emptyDraft);
                              }}
                            >
                              <X />
                              <span className="sr-only">Batal</span>
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => startEdit(item)}
                            >
                              <Pencil />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              disabled={pendingId === item.id}
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 />
                              <span className="sr-only">Hapus</span>
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {totalWeight !== 100 ? (
          <p className="text-xs text-muted-foreground">
            Total bobot sebaiknya 100% agar kontribusi skor tetap mudah
            dibaca. Sistem tetap menyimpan konfigurasi saat ini.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
