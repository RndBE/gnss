"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { CalendarRange, RotateCcw, Search, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  AnalysisGranularity,
  AwlrParameter,
  AwlrStationOption,
  DataAnalysisMode,
  GnssParameter,
  GnssRange,
  GnssStationOption,
} from "@/lib/types";

type ParameterOption = {
  label: string;
  value: string;
};

type DataAnalysisFilterBarProps = {
  mode: DataAnalysisMode;
  stationOptions: Array<GnssStationOption | AwlrStationOption>;
  selectedStationId: string;
  selectedParameter: GnssParameter | AwlrParameter;
  selectedRange: GnssRange;
  selectedDateFrom: string;
  selectedDateTo: string;
  selectedGranularity: AnalysisGranularity;
};

const modeItems: Array<{ label: string; value: DataAnalysisMode }> = [
  { label: "GNSS", value: "gnss" },
  { label: "AWLR", value: "awlr" },
];

const parameterItems: Record<DataAnalysisMode, ParameterOption[]> = {
  gnss: [
    { label: "X / Easting", value: "x" },
    { label: "Y / Northing", value: "y" },
    { label: "Z / Up", value: "z" },
    { label: "Velocity", value: "velocity" },
    { label: "PDOP", value: "pdop" },
    { label: "Fix ratio", value: "fixRatio" },
  ],
  awlr: [{ label: "Muka air", value: "waterLevel" }],
};

const rangeItems: Array<{ label: string; value: GnssRange }> = [
  { label: "30 hari", value: "30d" },
  { label: "90 hari", value: "90d" },
  { label: "180 hari", value: "180d" },
  { label: "Semua data", value: "all" },
  { label: "Pilih tanggal", value: "custom" },
];

const granularityItems: Array<{ label: string; value: AnalysisGranularity }> = [
  { label: "Per jam", value: "hourly" },
  { label: "Harian", value: "daily" },
];

const defaultParameterByMode: Record<DataAnalysisMode, string> = {
  gnss: "z",
  awlr: "waterLevel",
};

export function DataAnalysisFilterBar({
  mode,
  stationOptions,
  selectedStationId,
  selectedParameter,
  selectedRange,
  selectedDateFrom,
  selectedDateTo,
  selectedGranularity,
}: DataAnalysisFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [stationSearch, setStationSearch] = useState("");
  const filteredStationOptions = useMemo(() => {
    const query = stationSearch.trim().toLowerCase();

    if (!query) return stationOptions;

    return stationOptions.filter((station) =>
      `${station.name} ${station.area} ${station.status}`
        .toLowerCase()
        .includes(query),
    );
  }, [stationOptions, stationSearch]);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  function updateRange(value: GnssRange) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", value);

    if (value !== "custom") {
      params.delete("from");
      params.delete("to");
    }

    router.replace(`${pathname}?${params.toString()}`);
  }

  function updateDateFilter(key: "from" | "to", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", "custom");

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    router.replace(`${pathname}?${params.toString()}`);
  }

  function updateMode(value: DataAnalysisMode) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sensor", value);
    params.set("parameter", defaultParameterByMode[value]);
    params.delete("pos");
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="interactive-card flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-xs md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2 text-sm font-medium">
        <SlidersHorizontal className="interactive-icon size-4 text-muted-foreground" />
        Analisa Data Logger
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:items-center">
        <Select
          value={mode}
          onValueChange={(value) => {
            if (value === "gnss" || value === "awlr") updateMode(value);
          }}
          items={modeItems}
        >
          <SelectTrigger
            size="sm"
            className="w-full sm:w-[110px] **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
            aria-label="Pilih jenis logger"
          >
            <SelectValue placeholder="Sensor" />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectGroup>
              {modeItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          value={selectedStationId}
          onValueChange={(value) => {
            if (value) updateFilter("pos", value);
          }}
          items={stationOptions.map((station) => ({
            label: `${station.name} - ${station.area}`,
            value: station.id,
          }))}
        >
          <SelectTrigger
            size="sm"
            className="w-full sm:w-[260px] lg:w-[320px] **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
            aria-label="Pilih pos"
          >
            <SelectValue placeholder="Pilih pos" />
          </SelectTrigger>
          <SelectContent
            align="end"
            className="min-w-[320px] overflow-hidden"
          >
            <div
              className="sticky top-0 z-10 border-b bg-popover p-2"
              onKeyDown={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Cari pos monitoring"
                  className="h-8 pl-7"
                  placeholder="Cari nama pos atau area"
                  value={stationSearch}
                  onChange={(event) => setStationSearch(event.target.value)}
                />
              </div>
            </div>
            <SelectGroup>
              {filteredStationOptions.length > 0 ? (
                filteredStationOptions.map((station) => (
                  <SelectItem
                    className="py-2"
                    key={station.id}
                    value={station.id}
                  >
                    {station.name} - {station.area}
                  </SelectItem>
                ))
              ) : (
                <div className="px-2 py-3 text-sm text-muted-foreground">
                  Pos tidak ditemukan.
                </div>
              )}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          value={selectedParameter}
          onValueChange={(value) => {
            if (value) updateFilter("parameter", value);
          }}
          items={parameterItems[mode]}
        >
          <SelectTrigger
            size="sm"
            className="w-full sm:w-[150px] **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
            aria-label="Pilih parameter"
          >
            <SelectValue placeholder="Parameter" />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectGroup>
              {parameterItems[mode].map((item) => (
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
            if (
              value === "30d" ||
              value === "90d" ||
              value === "180d" ||
              value === "all" ||
              value === "custom"
            ) {
              updateRange(value);
            }
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

        <Select
          value={selectedGranularity}
          onValueChange={(value) => {
            if (value === "hourly" || value === "daily") {
              updateFilter("granularity", value);
            }
          }}
          items={granularityItems}
        >
          <SelectTrigger
            size="sm"
            className="w-full sm:w-[115px] **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
            aria-label="Pilih tipe data"
          >
            <SelectValue placeholder="Tipe data" />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectGroup>
              {granularityItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {selectedRange === "custom" ? (
          <>
            <Input
              aria-label="Tanggal mulai"
              className="h-7 w-full sm:w-[145px]"
              type="date"
              value={selectedDateFrom}
              onChange={(event) => updateDateFilter("from", event.target.value)}
            />
            <Input
              aria-label="Tanggal selesai"
              className="h-7 w-full sm:w-[145px]"
              type="date"
              value={selectedDateTo}
              onChange={(event) => updateDateFilter("to", event.target.value)}
            />
          </>
        ) : null}

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
