import { Camera } from "lucide-react";

import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CctvSnapshot } from "@/lib/types";

export function CctvGrid({ snapshots }: { snapshots: CctvSnapshot[] }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>CCTV Snapshot</CardTitle>
          <CardDescription>
            Snapshot visual titik kritis pesisir
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {snapshots.map((snapshot, index) => (
          <article
            className="interactive-card group/cctv overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
            key={snapshot.id}
          >
            <div
              className="relative aspect-video bg-slate-200 transition-transform duration-300 ease-out group-hover/cctv:scale-[1.015]"
              style={{
                background: snapshot.imageUrl
                  ? `center / cover no-repeat url("${snapshot.imageUrl}")`
                  : index === 0
                    ? "linear-gradient(180deg, #b7d7e8 0 42%, #7e9794 42% 46%, #d8d0b2 46% 60%, #53655f 60% 100%)"
                    : "linear-gradient(180deg, #c7d9e5 0 45%, #7a96a6 45% 58%, #d7ded7 58% 100%)",
              }}
            >
              <div className="absolute left-3 top-3 flex items-center gap-2 rounded-md bg-white/90 px-2 py-1 text-xs text-slate-700">
                <Camera className="interactive-icon size-3.5" />
                {snapshot.capturedAt}
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/35 to-transparent" />
            </div>
            <div className="flex items-start justify-between gap-3 p-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">
                  {snapshot.name}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {snapshot.area} - {snapshot.visibility}
                </p>
                {snapshot.note ? (
                  <p className="mt-2 line-clamp-2 text-xs text-slate-600">
                    {snapshot.note}
                  </p>
                ) : null}
              </div>
              <StatusBadge status={snapshot.status} />
            </div>
          </article>
        ))}
      </CardContent>
    </Card>
  );
}
