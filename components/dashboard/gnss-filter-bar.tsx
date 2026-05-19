"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarRange, RotateCcw, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  GnssParameter,
  GnssRange,
  GnssStationOption,
} from "@/lib/types";

type GnssFilterBarProps = {
  stations: GnssStationOption[];
  selectedStationId: string;
  selectedParameter: GnssParameter;
  selectedRange: GnssRange;
};

const parameterItems: Array<{ label: string; value: GnssParameter }> = [
  { label: "X / Easting", value: "x" },
  { label: "Y / Northing", value: "y" },
  { label: "Z / Up", value: "z" },
  { label: "Velocity", value: "velocity" },
  { label: "PDOP", value: "pdop" },
  { label: "Fix ratio", value: "fixRatio" },
];

const rangeItems: Array<{ label: string; value: GnssRange }> = [
  { label: "30 hari", value: "30d" },
  { label: "90 hari", value: "90d" },
  { label: "180 hari", value: "180d" },
  { label: "Semua data", value: "all" },
];

export function GnssFilterBar({
  stations,
  selectedStationId,
  selectedParameter,
  selectedRange,
}: GnssFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-xs md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2 text-sm font-medium">
        <SlidersHorizontal className="size-4 text-muted-foreground" />
        Monitoring GNSS
      </div>
      <div className="grid gap-2 sm:grid-cols-3 md:flex md:items-center">
        <Select
          value={selectedStationId}
          onValueChange={(value) => {
            if (value) updateFilter("pos", value);
          }}
          items={stations.map((station) => ({
            label: `${station.name} - ${station.area}`,
            value: station.id,
          }))}
        >
          <SelectTrigger
            size="sm"
            className="w-full sm:w-[190px] **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
            aria-label="Pilih pos GNSS"
          >
            <SelectValue placeholder="Pilih pos" />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectGroup>
              {stations.map((station) => (
                <SelectItem key={station.id} value={station.id}>
                  {station.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          value={selectedParameter}
          onValueChange={(value) => {
            if (value) updateFilter("parameter", value);
          }}
          items={parameterItems}
        >
          <SelectTrigger
            size="sm"
            className="w-full sm:w-[150px] **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
            aria-label="Pilih parameter GNSS"
          >
            <SelectValue placeholder="Parameter" />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectGroup>
              {parameterItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          value={selectedRange}
          onValueChange={(value) => {
            if (value) updateFilter("range", value);
          }}
          items={rangeItems}
        >
          <SelectTrigger
            size="sm"
            className="w-full sm:w-[130px] **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
            aria-label="Pilih rentang waktu"
          >
            <CalendarRange className="size-3.5 text-muted-foreground" />
            <SelectValue placeholder="Rentang" />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectGroup>
              {rangeItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => router.replace(pathname)}
        >
          <RotateCcw />
          Reset
        </Button>
      </div>
    </div>
  );
}
