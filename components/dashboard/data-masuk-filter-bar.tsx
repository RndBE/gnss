"use client";

import React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Combobox } from "@base-ui/react/combobox";
import { CalendarIcon, Check, ChevronsUpDown, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { LoggerDevicePickerOption } from "@/lib/types";

export function DataMasukFilterBar({
  devices,
  selectedDeviceCode,
  selectedDate,
  availableDates,
}: {
  devices: LoggerDevicePickerOption[];
  selectedDeviceCode: string | null;
  selectedDate: string | null;
  availableDates: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const items = React.useMemo(
    () =>
      devices.map((device) => ({
        id: device.deviceCode,
        label: `${device.deviceName} · ${device.deviceCode}`,
        sublabel: device.pointName
          ? `${device.pointName}${device.area ? ` · ${device.area}` : ""}`
          : "Belum terhubung ke pos",
        count: device.readingCount,
      })),
    [devices],
  );
  const selectedItem =
    items.find((item) => item.id === selectedDeviceCode) ?? null;

  function update(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="interactive-card flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-xs md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2 text-sm font-medium">
        <CalendarIcon className="size-4 text-muted-foreground" />
        Data Masuk Logger
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:items-center">
        <Combobox.Root
          items={items}
          value={selectedItem}
          onValueChange={(item) => {
            if (item && typeof item === "object" && "id" in item) {
              update("device", item.id as string);
            }
          }}
          isItemEqualToValue={(a, b) => a?.id === b?.id}
          itemToStringLabel={(item) => item?.label ?? ""}
          itemToStringValue={(item) => item?.id ?? ""}
        >
          <Combobox.Trigger
            aria-label="Pilih logger"
            className={cn(
              "flex h-7 w-full items-center justify-between gap-1.5 rounded-[min(var(--radius-md),10px)] border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap outline-none transition-colors select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50 sm:w-[280px] lg:w-[320px]",
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
                  {value?.label ?? "Pilih logger"}
                </span>
              )}
            </Combobox.Value>
            <Combobox.Icon className="pointer-events-none flex shrink-0 text-muted-foreground">
              <ChevronsUpDown className="size-3.5" />
            </Combobox.Icon>
          </Combobox.Trigger>

          <Combobox.Portal>
            <Combobox.Positioner align="start" sideOffset={4} className="isolate z-50">
              <Combobox.Popup
                className="max-h-[min(20rem,var(--available-height))] w-[min(var(--anchor-width),var(--available-width))] min-w-[280px] origin-[var(--transform-origin)] overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none"
                aria-label="Pilih logger"
              >
                <div className="border-b bg-popover p-2">
                  <Combobox.Input
                    placeholder="Cari kode atau nama logger"
                    className="flex h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </div>
                <Combobox.Empty className="px-3 py-4 text-center text-sm text-muted-foreground empty:hidden">
                  Logger tidak ditemukan.
                </Combobox.Empty>
                <Combobox.List className="max-h-64 overflow-y-auto p-1">
                  {(item: (typeof items)[number]) => (
                    <Combobox.Item
                      key={item.id}
                      value={item}
                      className="relative flex w-full cursor-default items-start gap-2 rounded-md py-2 pr-8 pl-2 text-sm outline-none select-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{item.label}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.sublabel} · {item.count} reading
                        </p>
                      </div>
                      <Combobox.ItemIndicator className="absolute right-2 top-2.5 flex size-4 items-center justify-center">
                        <Check className="size-4" />
                      </Combobox.ItemIndicator>
                    </Combobox.Item>
                  )}
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>

        <Input
          aria-label="Tanggal data"
          type="date"
          value={selectedDate ?? ""}
          list={availableDates.length > 0 ? "available-dates" : undefined}
          onChange={(event) => update("date", event.target.value || null)}
          className="h-7 w-full sm:w-[150px]"
        />
        {availableDates.length > 0 ? (
          <datalist id="available-dates">
            {availableDates.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
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
