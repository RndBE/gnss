import {
  ActivityIcon,
  AlertTriangleIcon,
  CameraIcon,
  DatabaseIcon,
  RadioTowerIcon,
  SatelliteIcon,
  WavesIcon,
  WifiIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { UserRole } from "@/lib/types"

export function LoginMonitoringVisual({ roles }: { roles: UserRole[] }) {
  const visibleRoles = roles.slice(0, 4)
  const telemetry = [
    { label: "GNSS", value: "3 pos", icon: RadioTowerIcon },
    { label: "AWLR", value: "2 pos", icon: WavesIcon },
    { label: "CCTV", value: "2 kamera", icon: CameraIcon },
  ]

  return (
    <section className="login-ops-bg relative hidden min-h-svh overflow-hidden bg-muted lg:block">
      <div className="relative flex min-h-full items-center justify-center p-10">
        <div className="relative h-[620px] w-full max-w-[800px]">
          <div className="login-command-card absolute inset-x-8 top-6 h-[430px] overflow-hidden rounded-xl border bg-background shadow-sm">
            <div className="absolute left-5 top-5 z-10 flex items-center gap-2">
              <Badge variant="secondary">Live coastal telemetry</Badge>
              <Badge variant="outline">Pantura</Badge>
            </div>
            <div className="absolute right-5 top-5 z-10 rounded-md border bg-background/80 px-3 py-2 text-xs text-muted-foreground backdrop-blur">
              19 titik data aktif
            </div>

            <svg
              aria-hidden="true"
              className="absolute inset-0 size-full"
              viewBox="0 0 820 470"
            >
              <defs>
                <pattern
                  id="login-grid"
                  width="42"
                  height="42"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M42 0H0V42"
                    fill="none"
                    stroke="#0f172a"
                    strokeOpacity=".07"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              <rect width="820" height="470" fill="url(#login-grid)" />
              <path
                d="M0 282 C98 252 158 262 252 238 C349 214 405 172 504 190 C603 208 648 160 820 128 L820 470 L0 470 Z"
                fill="#d9eef1"
              />
              <path
                className="login-coastline"
                d="M0 282 C98 252 158 262 252 238 C349 214 405 172 504 190 C603 208 648 160 820 128"
                fill="none"
                stroke="#0f766e"
                strokeDasharray="9 12"
                strokeWidth="3"
              />
              <path
                className="login-wave-line"
                d="M28 328 C108 302 168 338 246 314 C334 286 410 344 493 316 C596 281 665 331 790 292"
                fill="none"
                stroke="#0ea5e9"
                strokeLinecap="round"
                strokeWidth="2.5"
              />
              <path
                className="login-wave-line login-wave-line-delay"
                d="M24 379 C116 354 184 392 271 366 C362 338 444 393 536 365 C630 337 700 375 800 349"
                fill="none"
                stroke="#ef4444"
                strokeLinecap="round"
                strokeWidth="2"
              />
              <path
                className="login-data-route"
                d="M158 246 C238 212 303 224 376 206 C474 181 544 167 646 151"
                fill="none"
                stroke="#111827"
                strokeDasharray="7 10"
                strokeOpacity=".65"
                strokeWidth="2"
              />
            </svg>

            <div className="absolute left-[40%] top-[41%] size-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-300/70">
              <div className="absolute inset-7 rounded-full border border-sky-300/50" />
              <div className="absolute inset-16 rounded-full border border-sky-300/35" />
              <div className="login-radar-sweep absolute left-1/2 top-1/2 h-[2px] w-24 origin-left bg-sky-500/70" />
              <div className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-600" />
            </div>

            <MonitoringMarker
              className="left-[28%] top-[47%]"
              label="GNSS DMK-03"
              tone="emerald"
            />
            <MonitoringMarker
              className="left-[55%] top-[42%]"
              label="AWLR PKL-01"
              tone="sky"
            />
            <MonitoringMarker
              className="left-[73%] top-[30%]"
              label="CCTV Tanggul"
              tone="red"
            />

            <div className="absolute bottom-5 left-5 right-5 grid grid-cols-3 gap-3">
              <MetricTile label="Subsidence" value="-8.2" unit="cm/tahun" />
              <MetricTile label="Muka air" value="1.89" unit="m" />
              <MetricTile label="Alarm" value="3" unit="aktif" />
            </div>
          </div>

          <div className="login-side-panel absolute left-0 top-24 w-[280px] rounded-xl border bg-background/92 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-medium">
              <DatabaseIcon className="size-4 text-muted-foreground" />
              Sensor stack
            </div>
            <div className="mt-4 grid gap-2">
              {telemetry.map(({ label, value, icon: Icon }) => (
                <div
                  className="login-float-row flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm"
                  key={label}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="size-4 text-muted-foreground" />
                    {label}
                  </span>
                  <span className="font-medium tabular-nums">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="login-float-card absolute bottom-10 left-9 w-[330px] rounded-xl border bg-background/94 p-4 shadow-sm backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Risk engine</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Skor pesisir diperbarui dari telemetry lapangan.
                </p>
              </div>
              <ActivityIcon className="size-5 text-muted-foreground" />
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div className="login-scan-bar h-full rounded-full bg-foreground" />
            </div>
            <svg
              aria-hidden="true"
              className="mt-4 h-12 w-full"
              viewBox="0 0 280 48"
            >
              <path
                className="login-spark-line"
                d="M0 34 L32 28 L56 31 L84 18 L116 22 L148 12 L178 20 L210 10 L248 16 L280 8"
                fill="none"
                stroke="#111827"
                strokeLinecap="round"
                strokeWidth="2"
              />
            </svg>
            <div className="mt-3 flex items-center justify-between rounded-lg border bg-muted/45 px-3 py-2 text-xs">
              <span className="flex items-center gap-2 font-medium">
                <SatelliteIcon className="size-4 text-muted-foreground" />
                RTK fix 98.6%
              </span>
              <WifiIcon className="size-4 text-muted-foreground" />
            </div>
          </div>

          <div className="absolute bottom-6 right-2 flex w-[310px] flex-col gap-2">
            <div className="login-alert-strip flex items-center gap-3 rounded-xl border bg-background/94 px-4 py-3 text-sm shadow-sm backdrop-blur">
              <AlertTriangleIcon className="size-4 text-muted-foreground" />
              <div>
                <p className="font-medium">3 event perlu atensi</p>
                <p className="text-xs text-muted-foreground">
                  Rob, baterai rendah, dan sinyal lemah
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {visibleRoles.map((role, index) => (
                <div
                  className="login-role-chip rounded-xl border bg-background/90 px-3 py-2 text-sm shadow-sm backdrop-blur"
                  key={role.role}
                  style={{ animationDelay: `${index * 110}ms` }}
                >
                  <div className="grid gap-1">
                    <span className="truncate font-medium">{role.role}</span>
                    <span className="w-fit rounded-md border bg-background px-2 py-0.5 text-xs text-muted-foreground">
                      Aktif
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function MonitoringMarker({
  className,
  label,
  tone,
}: {
  className: string
  label: string
  tone: "emerald" | "red" | "sky"
}) {
  const toneClass = {
    emerald: "bg-emerald-500 ring-emerald-500/25",
    red: "bg-red-500 ring-red-500/25",
    sky: "bg-sky-500 ring-sky-500/25",
  }[tone]

  return (
    <div className={`absolute ${className}`}>
      <div className={`login-marker-ping size-4 rounded-full ring-8 ${toneClass}`} />
      <div className="mt-2 rounded-md border bg-background/90 px-2 py-1 text-xs font-medium shadow-sm">
        {label}
      </div>
    </div>
  )
}

function MetricTile({
  label,
  value,
  unit,
}: {
  label: string
  value: string
  unit: string
}) {
  return (
    <div className="rounded-md border bg-background/85 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">
        {value} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
      </p>
    </div>
  )
}
