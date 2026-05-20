"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  BatteryIcon,
  CalendarClockIcon,
  DropletsIcon,
  EditIcon,
  PlusIcon,
  RadioIcon,
  SaveIcon,
  ThermometerIcon,
  Trash2Icon,
  WifiIcon,
} from "lucide-react"

import { StatusBadge } from "@/components/dashboard/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import type {
  DeviceManagementItem,
  DevicePointOption,
  DeviceStatus,
  EventState,
  MaintenanceLog,
} from "@/lib/types"

type PrismaDeviceStatus = "ONLINE" | "WEAK" | "OFFLINE" | "MAINTENANCE"
type PrismaDeviceType = "GNSS" | "AWLR" | "CCTV" | "LOGGER" | "WEATHER"
type PrismaEventState = "OPEN" | "IN_PROGRESS" | "RESOLVED"

type DeviceFormState = {
  code: string
  name: string
  type: PrismaDeviceType
  status: PrismaDeviceStatus
  battery: string
  signal: string
  solarCharging: string
  firmwareVersion: string
  sensorStatus: string
  lastDataReceived: string
  pointId: string
}

type MaintenanceFormState = {
  deviceId: string
  technician: string
  scheduledAt: string
  note: string
  state: PrismaEventState
}

const statusVariant: Record<DeviceStatus, "Normal" | "Waspada" | "Siaga" | "Awas"> = {
  Online: "Normal",
  Weak: "Waspada",
  Offline: "Awas",
  Maintenance: "Siaga",
}

const deviceStatusToForm: Record<DeviceStatus, PrismaDeviceStatus> = {
  Online: "ONLINE",
  Weak: "WEAK",
  Offline: "OFFLINE",
  Maintenance: "MAINTENANCE",
}

const eventStateToForm: Record<EventState, PrismaEventState> = {
  Open: "OPEN",
  "In Progress": "IN_PROGRESS",
  Resolved: "RESOLVED",
}

const deviceTypeItems: Array<{ label: string; value: PrismaDeviceType }> = [
  { label: "GNSS", value: "GNSS" },
  { label: "AWLR", value: "AWLR" },
  { label: "CCTV", value: "CCTV" },
  { label: "Logger", value: "LOGGER" },
  { label: "Weather", value: "WEATHER" },
]

const deviceStatusItems: Array<{ label: string; value: PrismaDeviceStatus }> = [
  { label: "Online", value: "ONLINE" },
  { label: "Weak", value: "WEAK" },
  { label: "Offline", value: "OFFLINE" },
  { label: "Maintenance", value: "MAINTENANCE" },
]

const eventStateItems: Array<{ label: string; value: PrismaEventState }> = [
  { label: "Open", value: "OPEN" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Resolved", value: "RESOLVED" },
]

function formatTemperature(value: number | null) {
  return value == null ? "-" : `${value.toFixed(1)} C`
}

function formatHumidity(value: number | null) {
  return value == null ? "-" : `${value.toFixed(1)}%`
}

const emptyDeviceForm: DeviceFormState = {
  code: "",
  name: "",
  type: "LOGGER",
  status: "ONLINE",
  battery: "80",
  signal: "80",
  solarCharging: "true",
  firmwareVersion: "",
  sensorStatus: "",
  lastDataReceived: "",
  pointId: "",
}

function deviceToForm(device: DeviceManagementItem): DeviceFormState {
  return {
    code: device.code,
    name: device.name,
    type: device.type,
    status: deviceStatusToForm[device.status],
    battery: String(device.battery),
    signal: String(device.signal),
    solarCharging: String(device.solarCharging),
    firmwareVersion: device.firmwareVersion,
    sensorStatus: device.sensorStatus,
    lastDataReceived: device.lastDataReceived,
    pointId: device.pointId,
  }
}

function maintenanceToForm(log: MaintenanceLog): MaintenanceFormState {
  return {
    deviceId: log.deviceId,
    technician: log.technician,
    scheduledAt: log.scheduledAt,
    note: log.note,
    state: eventStateToForm[log.state],
  }
}

function nowInputValue() {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

function defaultMaintenanceForm(devices: DeviceManagementItem[]): MaintenanceFormState {
  return {
    deviceId: devices[0]?.id ?? "",
    technician: "",
    scheduledAt: nowInputValue(),
    note: "",
    state: "OPEN",
  }
}

function Field({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={`grid gap-2 ${className}`}>{children}</div>
}

export function DeviceManagementPanel({
  devices,
  maintenanceLogs,
  pointOptions,
}: {
  devices: DeviceManagementItem[]
  maintenanceLogs: MaintenanceLog[]
  pointOptions: DevicePointOption[]
}) {
  const router = useRouter()
  const [deviceSheetOpen, setDeviceSheetOpen] = useState(false)
  const [maintenanceSheetOpen, setMaintenanceSheetOpen] = useState(false)
  const [editingDevice, setEditingDevice] = useState<DeviceManagementItem | null>(null)
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceLog | null>(null)
  const [deviceForm, setDeviceForm] = useState<DeviceFormState>({
    ...emptyDeviceForm,
    lastDataReceived: nowInputValue(),
  })
  const [maintenanceForm, setMaintenanceForm] = useState<MaintenanceFormState>(
    defaultMaintenanceForm(devices),
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  function openNewDevice() {
    setEditingDevice(null)
    setDeviceForm({ ...emptyDeviceForm, lastDataReceived: nowInputValue() })
    setMessage(null)
    setDeviceSheetOpen(true)
  }

  function openEditDevice(device: DeviceManagementItem) {
    setEditingDevice(device)
    setDeviceForm(deviceToForm(device))
    setMessage(null)
    setDeviceSheetOpen(true)
  }

  function openNewMaintenance() {
    setEditingMaintenance(null)
    setMaintenanceForm(defaultMaintenanceForm(devices))
    setMessage(null)
    setMaintenanceSheetOpen(true)
  }

  function openEditMaintenance(log: MaintenanceLog) {
    setEditingMaintenance(log)
    setMaintenanceForm(maintenanceToForm(log))
    setMessage(null)
    setMaintenanceSheetOpen(true)
  }

  async function saveDevice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage(null)

    const endpoint = editingDevice ? `/api/devices/${editingDevice.id}` : "/api/devices"
    const response = await fetch(endpoint, {
      method: editingDevice ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...deviceForm,
        battery: Number(deviceForm.battery),
        signal: Number(deviceForm.signal),
        solarCharging: deviceForm.solarCharging === "true",
        pointId: deviceForm.pointId || null,
      }),
    })
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    setSaving(false)

    if (!response.ok) {
      setMessage(payload.error ?? "Gagal menyimpan perangkat.")
      return
    }

    setDeviceSheetOpen(false)
    router.refresh()
  }

  async function deleteDevice(device: DeviceManagementItem) {
    const confirmed = window.confirm(
      `Hapus ${device.name}? Semua jadwal maintenance perangkat ini juga akan dihapus.`,
    )

    if (!confirmed) return

    const response = await fetch(`/api/devices/${device.id}`, { method: "DELETE" })
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      setMessage(payload.error ?? "Gagal menghapus perangkat.")
      return
    }

    router.refresh()
  }

  async function saveMaintenance(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage(null)

    const endpoint = editingMaintenance
      ? `/api/maintenance/${editingMaintenance.id}`
      : "/api/maintenance"
    const response = await fetch(endpoint, {
      method: editingMaintenance ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(maintenanceForm),
    })
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    setSaving(false)

    if (!response.ok) {
      setMessage(payload.error ?? "Gagal menyimpan maintenance.")
      return
    }

    setMaintenanceSheetOpen(false)
    router.refresh()
  }

  async function deleteMaintenance(log: MaintenanceLog) {
    const confirmed = window.confirm(`Hapus jadwal maintenance ${log.device}?`)

    if (!confirmed) return

    const response = await fetch(`/api/maintenance/${log.id}`, { method: "DELETE" })
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      setMessage(payload.error ?? "Gagal menghapus maintenance.")
      return
    }

    router.refresh()
  }

  return (
    <div className="grid gap-4">
      {message ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {message}
        </div>
      ) : null}

      <Card className="interactive-card">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Status Perangkat</CardTitle>
              <CardDescription>
                Tambah, ubah status, telemetry, relasi pos, dan data terakhir.
              </CardDescription>
            </div>
            <Button onClick={openNewDevice} size="sm">
              <PlusIcon />
              Tambah Perangkat
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/45 hover:bg-muted/45">
                <TableHead>Perangkat</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Baterai</TableHead>
                <TableHead>Sinyal</TableHead>
                <TableHead>Temperature</TableHead>
                <TableHead>Humidity</TableHead>
                <TableHead>Pos</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((device) => (
                <TableRow className="group/device" key={device.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="interactive-tile flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-border group-hover/device:text-foreground">
                        <RadioIcon className="interactive-icon size-4" />
                      </div>
                      <div>
                        <div className="font-medium">{device.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {device.code} · {device.type}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={statusVariant[device.status]} />
                  </TableCell>
                  <TableCell className="min-w-32">
                    <div className="flex items-center gap-2">
                      <BatteryIcon className="interactive-icon size-4 text-muted-foreground" />
                      <Progress value={device.battery} />
                      <span className="w-9 text-xs text-muted-foreground">
                        {device.battery}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-32">
                    <div className="flex items-center gap-2">
                      <WifiIcon className="interactive-icon size-4 text-muted-foreground" />
                      <Progress value={device.signal} />
                      <span className="w-9 text-xs text-muted-foreground">
                        {device.signal}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-28">
                    <div className="flex items-center gap-2 text-sm">
                      <ThermometerIcon className="interactive-icon size-4 text-muted-foreground" />
                      <span>{formatTemperature(device.temperatureC)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-28">
                    <div className="flex items-center gap-2 text-sm">
                      <DropletsIcon className="interactive-icon size-4 text-muted-foreground" />
                      <span>{formatHumidity(device.humidityPct)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{device.pointName}</div>
                    <div className="text-xs text-muted-foreground">{device.area}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {device.lastDataLabel}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={() => openEditDevice(device)}
                        size="icon-sm"
                        variant="outline"
                      >
                        <EditIcon />
                        <span className="sr-only">Edit perangkat</span>
                      </Button>
                      <Button
                        onClick={() => deleteDevice(device)}
                        size="icon-sm"
                        variant="destructive"
                      >
                        <Trash2Icon />
                        <span className="sr-only">Hapus perangkat</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="interactive-card">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Jadwal Maintenance</CardTitle>
              <CardDescription>
                Buat jadwal, ubah teknisi, catatan pekerjaan, dan status progres.
              </CardDescription>
            </div>
            <Button onClick={openNewMaintenance} size="sm" variant="outline">
              <CalendarClockIcon />
              Tambah Maintenance
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {maintenanceLogs.map((log) => (
            <article
              className="interactive-card rounded-lg border p-4"
              key={log.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">{log.device}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {log.schedule} · {log.technician}
                  </p>
                </div>
                <Badge>{log.state}</Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{log.note}</p>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  onClick={() => openEditMaintenance(log)}
                  size="sm"
                  variant="outline"
                >
                  <EditIcon />
                  Edit
                </Button>
                <Button
                  onClick={() => deleteMaintenance(log)}
                  size="sm"
                  variant="destructive"
                >
                  <Trash2Icon />
                  Hapus
                </Button>
              </div>
            </article>
          ))}
        </CardContent>
      </Card>

      <Sheet open={deviceSheetOpen} onOpenChange={setDeviceSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <form onSubmit={saveDevice}>
            <SheetHeader>
              <SheetTitle>
                {editingDevice ? "Edit Perangkat" : "Tambah Perangkat"}
              </SheetTitle>
              <SheetDescription>
                Data ini tersimpan ke tabel perangkat.
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 px-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <Label htmlFor="device-code">Kode</Label>
                  <Input
                    id="device-code"
                    required
                    value={deviceForm.code}
                    onChange={(event) =>
                      setDeviceForm((form) => ({ ...form, code: event.target.value }))
                    }
                  />
                </Field>
                <Field>
                  <Label htmlFor="device-name">Nama</Label>
                  <Input
                    id="device-name"
                    required
                    value={deviceForm.name}
                    onChange={(event) =>
                      setDeviceForm((form) => ({ ...form, name: event.target.value }))
                    }
                  />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <Label>Tipe</Label>
                  <Select
                    value={deviceForm.type}
                    onValueChange={(value) =>
                      setDeviceForm((form) => ({
                        ...form,
                        type: value as PrismaDeviceType,
                      }))
                    }
                    items={deviceTypeItems}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {deviceTypeItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <Label>Status</Label>
                  <Select
                    value={deviceForm.status}
                    onValueChange={(value) =>
                      setDeviceForm((form) => ({
                        ...form,
                        status: value as PrismaDeviceStatus,
                      }))
                    }
                    items={deviceStatusItems}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {deviceStatusItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <Label htmlFor="device-battery">Baterai (%)</Label>
                  <Input
                    id="device-battery"
                    max={100}
                    min={0}
                    required
                    type="number"
                    value={deviceForm.battery}
                    onChange={(event) =>
                      setDeviceForm((form) => ({
                        ...form,
                        battery: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field>
                  <Label htmlFor="device-signal">Sinyal (%)</Label>
                  <Input
                    id="device-signal"
                    max={100}
                    min={0}
                    required
                    type="number"
                    value={deviceForm.signal}
                    onChange={(event) =>
                      setDeviceForm((form) => ({
                        ...form,
                        signal: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <Label>Panel surya</Label>
	                  <Select
	                    value={deviceForm.solarCharging}
	                    onValueChange={(value) =>
	                      setDeviceForm((form) => ({
	                        ...form,
	                        solarCharging: value ?? "true",
	                      }))
	                    }
                    items={[
                      { label: "Charging", value: "true" },
                      { label: "Tidak charging", value: "false" },
                    ]}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="true">Charging</SelectItem>
                        <SelectItem value="false">Tidak charging</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <Label htmlFor="device-last-data">Data terakhir</Label>
                  <Input
                    id="device-last-data"
                    required
                    type="datetime-local"
                    value={deviceForm.lastDataReceived}
                    onChange={(event) =>
                      setDeviceForm((form) => ({
                        ...form,
                        lastDataReceived: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>

              <Field>
                <Label>Relasi pos</Label>
                <Select
	                  value={deviceForm.pointId || "none"}
	                  onValueChange={(value) =>
	                    setDeviceForm((form) => ({
	                      ...form,
	                      pointId: !value || value === "none" ? "" : value,
	                    }))
	                  }
                  items={[
                    { label: "Tidak terhubung", value: "none" },
                    ...pointOptions.map((point) => ({
                      label: `${point.name} - ${point.area}`,
                      value: point.id,
                    })),
                  ]}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="none">Tidak terhubung</SelectItem>
                      {pointOptions.map((point) => (
                        <SelectItem key={point.id} value={point.id}>
                          {point.name} - {point.area}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <Label htmlFor="device-firmware">Firmware</Label>
                <Input
                  id="device-firmware"
                  value={deviceForm.firmwareVersion}
                  onChange={(event) =>
                    setDeviceForm((form) => ({
                      ...form,
                      firmwareVersion: event.target.value,
                    }))
                  }
                />
              </Field>

              <Field>
                <Label htmlFor="device-sensor-status">Catatan sensor</Label>
                <Textarea
                  id="device-sensor-status"
                  value={deviceForm.sensorStatus}
                  onChange={(event) =>
                    setDeviceForm((form) => ({
                      ...form,
                      sensorStatus: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>
            <SheetFooter>
              <Button disabled={saving} type="submit">
                <SaveIcon />
                {saving ? "Menyimpan" : "Simpan"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={maintenanceSheetOpen} onOpenChange={setMaintenanceSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <form onSubmit={saveMaintenance}>
            <SheetHeader>
              <SheetTitle>
                {editingMaintenance ? "Edit Maintenance" : "Tambah Maintenance"}
              </SheetTitle>
              <SheetDescription>
                Jadwal dan catatan teknisi tersimpan ke database.
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 px-4">
              <Field>
                <Label>Perangkat</Label>
                <Select
	                  value={maintenanceForm.deviceId}
	                  onValueChange={(value) =>
	                    setMaintenanceForm((form) => ({
	                      ...form,
	                      deviceId: value ?? "",
	                    }))
	                  }
                  items={devices.map((device) => ({
                    label: device.name,
                    value: device.id,
                  }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {devices.map((device) => (
                        <SelectItem key={device.id} value={device.id}>
                          {device.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <Label htmlFor="maintenance-time">Jadwal</Label>
                  <Input
                    id="maintenance-time"
                    required
                    type="datetime-local"
                    value={maintenanceForm.scheduledAt}
                    onChange={(event) =>
                      setMaintenanceForm((form) => ({
                        ...form,
                        scheduledAt: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field>
                  <Label>Status</Label>
                  <Select
                    value={maintenanceForm.state}
                    onValueChange={(value) =>
                      setMaintenanceForm((form) => ({
                        ...form,
                        state: value as PrismaEventState,
                      }))
                    }
                    items={eventStateItems}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {eventStateItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field>
                <Label htmlFor="maintenance-technician">Teknisi</Label>
                <Input
                  id="maintenance-technician"
                  required
                  value={maintenanceForm.technician}
                  onChange={(event) =>
                    setMaintenanceForm((form) => ({
                      ...form,
                      technician: event.target.value,
                    }))
                  }
                />
              </Field>

              <Field>
                <Label htmlFor="maintenance-note">Catatan</Label>
                <Textarea
                  id="maintenance-note"
                  required
                  value={maintenanceForm.note}
                  onChange={(event) =>
                    setMaintenanceForm((form) => ({
                      ...form,
                      note: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>
            <SheetFooter>
              <Button disabled={saving || !maintenanceForm.deviceId} type="submit">
                <SaveIcon />
                {saving ? "Menyimpan" : "Simpan"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
