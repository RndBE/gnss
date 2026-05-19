import { ArrowUpRight } from "lucide-react";

import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Progress,
  ProgressLabel,
} from "@/components/ui/progress";
import type { RiskArea, RiskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const progressClasses: Record<RiskStatus, string> = {
  Normal: "[&_[data-slot=progress-indicator]]:bg-emerald-500",
  Waspada: "[&_[data-slot=progress-indicator]]:bg-amber-500",
  Siaga: "[&_[data-slot=progress-indicator]]:bg-orange-500",
  Awas: "[&_[data-slot=progress-indicator]]:bg-red-600",
};

export function RiskPanel({ areas }: { areas: RiskArea[] }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Panel Risiko Rob</CardTitle>
          <CardDescription>
            Skor rule-based untuk prioritas respons
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {areas.map((area) => {
          const waterLevel =
            area.waterLevel === "-" ? "Belum ada data" : area.waterLevel;

          return (
            <div
              className="interactive-card rounded-lg border bg-card p-4 shadow-xs"
              key={area.area}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <h3 className="truncate text-sm font-semibold">
                      {area.area}
                    </h3>
                    <ArrowUpRight className="interactive-icon size-3.5 shrink-0 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Jam rawan {area.nextWindow}
                  </p>
                </div>
                <StatusBadge className="mt-0.5" status={area.status} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="interactive-tile rounded-md bg-muted/45 p-2.5">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Penurunan
                  </p>
                  <p className="mt-1 text-sm font-semibold tabular-nums">
                    {area.subsidenceRate}
                  </p>
                </div>
                <div className="interactive-tile rounded-md bg-muted/45 p-2.5">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Muka air
                  </p>
                  <p className="mt-1 text-sm font-semibold tabular-nums">
                    {waterLevel}
                  </p>
                </div>
              </div>

              <Progress
                className={cn("mt-4 gap-2", progressClasses[area.status])}
                value={area.score}
              >
                <ProgressLabel className="text-xs font-medium text-muted-foreground">
                  Skor risiko
                </ProgressLabel>
                <span className="ml-auto text-xs font-semibold tabular-nums text-foreground">
                  {area.score}/100
                </span>
              </Progress>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
