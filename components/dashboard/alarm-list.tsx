"use client";

import { useState, useTransition } from "react";
import { BellRing, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AlarmEvent } from "@/lib/types";

export function AlarmList({ alarms }: { alarms: AlarmEvent[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function validateAlarm(alarmId: string) {
    setPendingId(alarmId);
    setMessage(null);

    const response = await fetch("/api/alarms/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alarmId }),
    });
    const payload = await response.json().catch(() => ({}));
    setPendingId(null);

    if (!response.ok) {
      setMessage(payload.error ?? "Alarm gagal divalidasi.");
      return;
    }

    setMessage(`Alarm ${payload.alarmId} sudah divalidasi.`);
    startTransition(() => router.refresh());
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Alarm Terbaru</CardTitle>
          <CardDescription>
            Event aktif dan tindak lanjut operator
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {alarms.map((alarm) => (
          <article
            className="interactive-card group/alarm flex gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3"
            key={alarm.id}
          >
            <div className="interactive-tile mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700 ring-1 ring-slate-200 group-hover/alarm:text-slate-950">
              <BellRing className="interactive-icon size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-950">
                  {alarm.type}
                </h3>
                <StatusBadge status={alarm.status} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {alarm.area} - {alarm.time} - {alarm.state}
              </p>
              <p className="mt-2 text-sm leading-5 text-slate-600">{alarm.message}</p>
              {alarm.requiresValidation ? (
                <div className="mt-3">
                  <Button
                    disabled={pendingId === alarm.id || isPending}
                    size="sm"
                    variant="outline"
                    onClick={() => validateAlarm(alarm.id)}
                  >
                    <CheckCircle2 />
                    Validasi
                  </Button>
                </div>
              ) : null}
            </div>
          </article>
        ))}
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </CardContent>
    </Card>
  );
}
