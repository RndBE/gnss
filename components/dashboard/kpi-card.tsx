import type { LucideIcon } from "lucide-react";

import { StatusBadge } from "@/components/dashboard/status-badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { RiskStatus } from "@/lib/types";

type KpiCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  status?: RiskStatus;
  progress?: number;
};

const toneByStatus: Record<RiskStatus, string> = {
  Normal: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Waspada: "bg-amber-50 text-amber-700 ring-amber-200",
  Siaga: "bg-orange-50 text-orange-700 ring-orange-200",
  Awas: "bg-red-50 text-red-700 ring-red-200",
};

export function KpiCard({
  detail,
  icon: Icon,
  label,
  progress,
  status,
  value,
}: KpiCardProps) {
  return (
    <Card className="min-h-36 overflow-hidden p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-normal text-slate-500">
            {label}
          </p>
          <div className="text-2xl font-semibold tracking-normal text-slate-950">
            {value}
          </div>
        </div>
        <div
          className={`flex size-10 items-center justify-center rounded-lg ring-1 ${
            status ? toneByStatus[status] : "bg-slate-100 text-slate-700 ring-slate-200"
          }`}
        >
          <Icon className="size-5" />
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-2 text-xs text-slate-500">
        <span>{detail}</span>
        {status ? <StatusBadge status={status} /> : null}
      </div>
      <Progress className="mt-3" value={progress ?? (status === "Awas" ? 92 : status === "Siaga" ? 72 : status === "Waspada" ? 55 : 35)} />
    </Card>
  );
}
