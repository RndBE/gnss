"use client"

import { useMemo, useState } from "react"
import L, { type LatLngBoundsExpression } from "leaflet"
import {
  Camera,
  EyeIcon,
  LayersIcon,
  RadioTower,
  SlidersHorizontalIcon,
  Waves,
  XIcon,
} from "lucide-react"
import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
} from "react-leaflet"

import {
  StatusBadge,
  statusDotClasses,
} from "@/components/dashboard/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import type { MonitoringPoint, PointType, RiskStatus } from "@/lib/types"

const panturaBounds: LatLngBoundsExpression = [
  [-7.08, 109.55],
  [-6.72, 110.75],
]

const riskColors: Record<RiskStatus, string> = {
  Normal: "#10b981",
  Waspada: "#f59e0b",
  Siaga: "#f97316",
  Awas: "#dc2626",
}

const typeLabel: Record<PointType, string> = {
  GNSS: "GNSS",
  AWLR: "AWLR",
  CCTV: "CCTV",
}

const pointTypes: PointType[] = ["GNSS", "AWLR", "CCTV"]

const riskStatuses: RiskStatus[] = ["Awas", "Siaga", "Waspada", "Normal"]

const infrastructurePoints: {
  name: string
  position: [number, number]
}[] = [
  {
    name: "Pelabuhan Tanjung Emas",
    position: [-6.944, 110.423],
  },
  {
    name: "Kawasan Tanggul Pekalongan",
    position: [-6.858, 109.683],
  },
  {
    name: "Koridor Tambak Sayung",
    position: [-6.885, 110.62],
  },
]

const typeIconSvg: Record<PointType, string> = {
  GNSS: `
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M4.9 16.1a9.5 9.5 0 0 1 0-8.2" />
      <path d="M7.8 13.2a5.5 5.5 0 0 1 0-2.4" />
      <path d="M16.2 10.8a5.5 5.5 0 0 1 0 2.4" />
      <path d="M19.1 7.9a9.5 9.5 0 0 1 0 8.2" />
      <path d="M12 12h.01" />
      <path d="M10 20h4" />
      <path d="m12 12 2 8" />
      <path d="m12 12-2 8" />
    </svg>
  `,
  AWLR: `
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5s2.5 2 5 2 2.5-2 5-2c1.3 0 1.9.5 2.5 1" />
      <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2c1.3 0 1.9.5 2.5 1" />
      <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2c1.3 0 1.9.5 2.5 1" />
    </svg>
  `,
  CCTV: `
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  `,
}

function pointIcon(point: MonitoringPoint) {
  const color = riskColors[point.status]
  const icon = typeIconSvg[point.type]

  return L.divIcon({
    className: "risk-map-marker",
    html: `
      <div style="
        position: relative;
        width: 38px;
        height: 38px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        border: 3px solid ${color};
        background: rgba(255, 255, 255, 0.96);
        color: ${color};
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.25);
      ">
        ${icon}
        <span style="
          position: absolute;
          right: -1px;
          bottom: -1px;
          width: 11px;
          height: 11px;
          border-radius: 999px;
          border: 2px solid white;
          background: ${color};
        "></span>
      </div>
    `,
    iconAnchor: [19, 19],
    iconSize: [38, 38],
    popupAnchor: [0, -20],
  })
}

export default function LeafletRiskMap({
  points,
}: {
  points: MonitoringPoint[]
}) {
  const [enabledTypes, setEnabledTypes] = useState<Set<PointType>>(
    () => new Set(pointTypes)
  )
  const [enabledStatuses, setEnabledStatuses] = useState<Set<RiskStatus>>(
    () => new Set(riskStatuses)
  )
  const [layers, setLayers] = useState({
    infrastructure: true,
  })
  const [controlsOpen, setControlsOpen] = useState(false)
  const icons = useMemo(
    () =>
      new Map(
        points.map((point) => [
          point.id,
          {
            color: riskColors[point.status],
            icon: pointIcon(point),
          },
        ])
      ),
    [points]
  )
  const visiblePoints = points.filter(
    (point) =>
      enabledTypes.has(point.type) && enabledStatuses.has(point.status)
  )

  function toggleType(type: PointType) {
    setEnabledTypes((current) => {
      const next = new Set(current)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  function toggleStatus(status: RiskStatus) {
    setEnabledStatuses((current) => {
      const next = new Set(current)
      if (next.has(status)) {
        next.delete(status)
      } else {
        next.add(status)
      }
      return next
    })
  }

  return (
    <div className="relative h-full min-h-[400px] overflow-hidden">
      <MapContainer
        bounds={panturaBounds}
        boundsOptions={{ padding: [26, 26] }}
        className="h-full w-full"
        maxBounds={[
          [-7.35, 109.2],
          [-6.45, 111.1],
        ]}
        maxZoom={16}
        minZoom={9}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {layers.infrastructure &&
          infrastructurePoints.map((item) => (
            <CircleMarker
              center={item.position}
              key={item.name}
              pathOptions={{
                color: "#475569",
                fillColor: "#0f172a",
                fillOpacity: 0.7,
                opacity: 0.8,
                weight: 1,
              }}
              radius={6}
            >
              <Tooltip direction="top" opacity={1}>
                {item.name}
              </Tooltip>
            </CircleMarker>
          ))}
        {visiblePoints.map((point) => {
          const marker = icons.get(point.id)
          const Icon =
            point.type === "GNSS"
              ? RadioTower
              : point.type === "AWLR"
                ? Waves
                : Camera

          return (
            <Marker
              icon={marker?.icon}
              key={point.id}
              position={[point.lat, point.lon]}
            >
              <Tooltip direction="top" offset={[0, -16]} opacity={1}>
                {point.name}
              </Tooltip>
              <Popup minWidth={220}>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                      <Icon className="size-4" />
                      {point.name}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {point.area} - {typeLabel[point.type]}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-slate-700">
                      {point.value}
                    </span>
                    <StatusBadge status={point.status} />
                  </div>
                  <div className="text-xs text-slate-500">
                    Koordinat {point.lat.toFixed(3)}, {point.lon.toFixed(3)}
                    <br />
                    Update {point.lastUpdate}
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      <Button
        aria-expanded={controlsOpen}
        className="absolute right-3 top-3 z-[500] bg-background/95 shadow-lg backdrop-blur"
        onClick={() => setControlsOpen((open) => !open)}
        size="sm"
        variant="outline"
      >
        <SlidersHorizontalIcon data-icon="inline-start" />
        Layer & Filter
      </Button>

      {controlsOpen && (
        <div className="absolute right-3 top-14 z-[500] w-[min(330px,calc(100%-1.5rem))] rounded-xl border bg-background/95 p-3 text-xs shadow-xl backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-medium">
              <LayersIcon className="size-4" />
              Layer
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline">Pantura</Badge>
              <Button
                aria-label="Tutup kontrol peta"
                onClick={() => setControlsOpen(false)}
                size="icon-xs"
                variant="ghost"
              >
                <XIcon />
              </Button>
            </div>
          </div>
          <div className="mt-3 grid gap-2">
            <Label className="text-xs font-normal">
              <Checkbox
                checked={layers.infrastructure}
                onCheckedChange={(checked) => {
                  setLayers((current) => ({
                    ...current,
                    infrastructure: checked === true,
                  }))
                }}
              />
              Infrastruktur
            </Label>
          </div>

          <div className="mt-4 border-t pt-3">
            <div className="mb-2 flex items-center gap-2 font-medium">
              <SlidersHorizontalIcon className="size-4" />
              Filter Marker
            </div>
            <div className="grid grid-cols-3 gap-2">
              {pointTypes.map((type) => (
                <Label className="text-xs font-normal" key={type}>
                  <Checkbox
                    checked={enabledTypes.has(type)}
                    onCheckedChange={() => toggleType(type)}
                  />
                  {type}
                </Label>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {riskStatuses.map((status) => (
                <Label className="text-xs font-normal" key={status}>
                  <Checkbox
                    checked={enabledStatuses.has(status)}
                    onCheckedChange={() => toggleStatus(status)}
                  />
                  <span
                    className={`size-2 rounded-full ${statusDotClasses[status]}`}
                  />
                  {status}
                </Label>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-4 left-3 z-[400] flex flex-wrap items-center gap-3 rounded-lg border bg-background/95 px-3 py-2 text-xs shadow-sm backdrop-blur">
        <span className="flex items-center gap-1.5">
          <RadioTower className="size-3.5 text-slate-700" />
          GNSS
        </span>
        <span className="flex items-center gap-1.5">
          <Waves className="size-3.5 text-slate-700" />
          AWLR
        </span>
        <span className="flex items-center gap-1.5">
          <Camera className="size-3.5 text-slate-700" />
          CCTV
        </span>
        <span className="flex items-center gap-1.5 border-l pl-3 text-muted-foreground">
          <EyeIcon className="size-3.5" />
          Klik marker untuk detail titik
        </span>
      </div>
    </div>
  )
}
