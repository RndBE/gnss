import { Camera, Clock3, MapPin } from "lucide-react";

import { StatusBadge } from "@/components/dashboard/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CctvSnapshot } from "@/lib/types";

const visibilityLabels: Record<CctvSnapshot["visibility"], string> = {
  Clear: "Jelas",
  Rain: "Hujan",
  "Low light": "Cahaya rendah",
};

export function CctvGrid({ snapshots }: { snapshots: CctvSnapshot[] }) {
  return (
    <Card className="interactive-card">
      <CardHeader className="border-b">
        <div>
          <CardTitle>Snapshot CCTV</CardTitle>
          <CardDescription>
            Snapshot visual titik kritis pesisir
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {snapshots.map((snapshot, index) => (
          <article
            className="group/cctv overflow-hidden rounded-lg border bg-card shadow-sm transition-colors hover:bg-muted/20"
            key={snapshot.id}
          >
            <div
              className="relative aspect-video bg-muted"
              style={{
                background: snapshot.imageUrl
                  ? `center / cover no-repeat url("${snapshot.imageUrl}")`
                  : index === 0
                    ? "linear-gradient(180deg, #b7d7e8 0 42%, #7e9794 42% 46%, #d8d0b2 46% 60%, #53655f 60% 100%)"
                    : "linear-gradient(180deg, #c7d9e5 0 45%, #7a96a6 45% 58%, #d7ded7 58% 100%)",
              }}
            >
              <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-black/55 to-transparent p-3">
                <Badge className="border-white/20 bg-black/35 text-white hover:bg-black/35" variant="outline">
                  <Camera className="size-3.5" />
                  CCTV
                </Badge>
                <StatusBadge className="bg-white/90" status={snapshot.status} />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-3 text-white">
                <p className="truncate text-sm font-semibold">{snapshot.name}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-white/80">
                  <MapPin className="size-3" />
                  {snapshot.area}
                </p>
              </div>
            </div>
            <div className="grid gap-3 p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock3 className="size-3.5" />
                  {snapshot.capturedAt}
                </span>
                <span className="rounded-md bg-muted px-2 py-1">
                  {visibilityLabels[snapshot.visibility]}
                </span>
              </div>
              {snapshot.note ? (
                <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                  {snapshot.note}
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </CardContent>
    </Card>
  );
}
