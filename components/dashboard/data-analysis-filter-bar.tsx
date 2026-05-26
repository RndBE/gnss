"use client";

import React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Combobox } from "@base-ui/react/combobox";
import { CalendarRange, Check, ChevronsUpDown, RotateCcw, SlidersHorizontal } from "lucide-react";

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
import { cn } from "@/lib/utils";
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
  action?: React.ReactNode;
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
    { label: "Akumulasi turun", value: "subsidence" },
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
  action,
}: DataAnalysisFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const stationItems = React.useMemo(
    () =>
      stationOptions.map((station) => ({
        id: station.id,
        label: `${station.name} - ${station.area}`,
        name: station.name,
        area: station.area,
      })),
    [stationOptions],
  );
  const selectedStationItem =
    stationItems.find((item) => item.id === selectedStationId) ?? null;

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
    <div className="data-analysis-filter-bar flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-xs md:flex-row md:items-center md:justify-between">
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

        <Combobox.Root
          items={stationItems}
          value={selectedStationItem}
          onValueChange={(item) => {
            if (item && typeof item === "object" && "id" in item) {
              updateFilter("pos", item.id);
            }
          }}
          isItemEqualToValue={(a, b) => a?.id === b?.id}
          itemToStringLabel={(item) => item?.label ?? ""}
          itemToStringValue={(item) => item?.id ?? ""}
        >
          <Combobox.Trigger
            aria-label="Pilih pos"
            className={cn(
              "flex h-7 w-full items-center justify-between gap-1.5 rounded-[min(var(--radius-md),10px)] border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap outline-none transition-colors select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50 sm:w-[260px] lg:w-[320px]",
            )}
          >
            <Combobox.Value>
              {(value: { label?: string } | null) => (
                <span
                  className={cn(
                    "line-clamp-1 flex-1 text-left",
                    !value && "text-muted-foreground",
                  )}
                >
                  {value?.label ?? "Pilih pos"}
                </span>
              )}
            </Combobox.Value>
            <Combobox.Icon className="pointer-events-none flex shrink-0 text-muted-foreground">
              <ChevronsUpDown className="size-3.5" />
            </Combobox.Icon>
          </Combobox.Trigger>

          <Combobox.Portal>
            <Combobox.Positioner align="end" sideOffset={4} className="isolate z-50">
              <Combobox.Popup
                className="max-h-[min(20rem,var(--available-height))] w-[min(var(--anchor-width),var(--available-width))] min-w-[260px] origin-[var(--transform-origin)] overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none transition-[transform,scale,opacity] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0"
                aria-label="Pilih pos"
              >
                <div className="border-b bg-popover p-2">
                  <Combobox.Input
                    placeholder="Cari nama pos atau area"
                    className="flex h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </div>
                <Combobox.Empty className="px-3 py-4 text-center text-sm text-muted-foreground empty:hidden">
                  Pos tidak ditemukan.
                </Combobox.Empty>
                <Combobox.List className="max-h-64 overflow-y-auto p-1">
                  {(item: (typeof stationItems)[number]) => (
                    <Combobox.Item
                      key={item.id}
                      value={item}
                      className="relative flex w-full cursor-default items-center gap-2 rounded-md py-2 pr-8 pl-2 text-sm outline-none select-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                    >
                      <span className="flex-1 truncate">{item.label}</span>
                      <Combobox.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
                        <Check className="size-4" />
                      </Combobox.ItemIndicator>
                    </Combobox.Item>
                  )}
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>

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
        {action}
      </div>
    </div>
  );
}
