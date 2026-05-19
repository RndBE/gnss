import { Badge } from "@/components/ui/badge";
import type { RiskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusClasses: Record<RiskStatus, string> = {
  Normal:
    "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
  Waspada: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-50",
  Siaga: "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-50",
  Awas: "border-red-200 bg-red-50 text-red-700 hover:bg-red-50",
};

export const statusDotClasses: Record<RiskStatus, string> = {
  Normal: "bg-emerald-500",
  Waspada: "bg-amber-500",
  Siaga: "bg-orange-500",
  Awas: "bg-red-600",
};

type StatusBadgeProps = {
  className?: string;
  status: RiskStatus;
};

export function StatusBadge({ className, status }: StatusBadgeProps) {
  return (
    <Badge
      className={cn("border", statusClasses[status], className)}
      variant="outline"
    >
      {status}
    </Badge>
  );
}
