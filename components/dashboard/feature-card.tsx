import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";

type FeatureCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export function FeatureCard({ description, icon: Icon, title }: FeatureCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 ring-1 ring-slate-200">
          <Icon className="size-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
          <p className="mt-1 text-sm leading-5 text-slate-600">{description}</p>
        </div>
      </div>
    </Card>
  );
}
