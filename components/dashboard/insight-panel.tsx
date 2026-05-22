"use client";

import { Lightbulb } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Insight, InsightSeverity } from "@/lib/insights";

const severityStyles: Record<
  InsightSeverity,
  { border: string; bg: string; dot: string; label: string }
> = {
  ok: {
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    dot: "bg-emerald-500",
    label: "text-emerald-700",
  },
  info: {
    border: "border-blue-200",
    bg: "bg-blue-50",
    dot: "bg-blue-500",
    label: "text-blue-700",
  },
  warning: {
    border: "border-amber-200",
    bg: "bg-amber-50",
    dot: "bg-amber-500",
    label: "text-amber-700",
  },
  danger: {
    border: "border-red-200",
    bg: "bg-red-50",
    dot: "bg-red-500",
    label: "text-red-700",
  },
};

type InsightPanelProps = {
  insights: Insight[];
  stationName: string;
  mode: "gnss" | "awlr";
};

export function InsightPanel({ insights, stationName, mode }: InsightPanelProps) {
  const modeLabel = mode === "gnss" ? "GNSS" : "AWLR";
  const dangerCount = insights.filter((i) => i.severity === "danger").length;
  const warningCount = insights.filter((i) => i.severity === "warning").length;

  const buttonVariant =
    dangerCount > 0 ? "destructive" : warningCount > 0 ? "outline" : "outline";
  const buttonClass =
    dangerCount > 0
      ? undefined
      : warningCount > 0
        ? "border-amber-300 text-amber-700 hover:bg-amber-50"
        : undefined;

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant={buttonVariant} size="sm" className={cn(buttonClass)} />
        }
      >
        <Lightbulb className="size-3.5" />
        Insight
        {(dangerCount > 0 || warningCount > 0) && (
          <span
            className={cn(
              "ml-1 flex size-4 items-center justify-center rounded-full text-[10px] font-bold",
              dangerCount > 0
                ? "bg-white/25 text-white"
                : "bg-amber-100 text-amber-700",
            )}
          >
            {dangerCount > 0 ? dangerCount + warningCount : warningCount}
          </span>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="flex w-[360px] flex-col gap-0 p-0 sm:max-w-[360px]">
        <SheetHeader className="border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="size-4 text-muted-foreground" />
            <SheetTitle>Insight Otomatis</SheetTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            {modeLabel} · {stationName}
          </p>
        </SheetHeader>

        <div className="flex flex-col gap-3 overflow-y-auto p-4">
          {insights.map((insight, i) => {
            const styles = severityStyles[insight.severity];
            return (
              <div
                key={i}
                className={cn("rounded-lg border p-3", styles.border, styles.bg)}
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <span className={cn("size-2 shrink-0 rounded-full", styles.dot)} />
                  <span className={cn("text-xs font-semibold", styles.label)}>
                    {insight.category}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-foreground">
                  {insight.text}
                </p>
              </div>
            );
          })}

          {insights.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              Tidak cukup data untuk menghasilkan insight.
            </p>
          )}
        </div>

        <div className="border-t px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {insights.length} insight · Diperbarui otomatis sesuai filter aktif
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
