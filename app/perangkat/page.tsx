import { AppShell } from "@/components/dashboard/app-shell";
import { DeviceManagementPanel } from "@/components/dashboard/device-management-panel";
import { LoggerLivePanel } from "@/components/dashboard/logger-live-panel";
import {
  getDeviceManagementItems,
  getDevicePointOptions,
  getDashboardSummary,
  getLoggerParametersGrouped,
  getMaintenanceLogs,
} from "@/lib/backend/queries";

export const dynamic = "force-dynamic";

export default async function PerangkatPage() {
  const [summary, devices, maintenanceLogs, pointOptions, gnssLoggers] =
    await Promise.all([
      getDashboardSummary(),
      getDeviceManagementItems(),
      getMaintenanceLogs(),
      getDevicePointOptions(),
      getLoggerParametersGrouped("GNSS"),
    ]);

  return (
    <AppShell
      activeArea={summary.activeArea}
      activePath="/perangkat"
      title="Perangkat dan Telemetry Logger"
      updatedAt={summary.updatedAt}
    >
      <div className="grid gap-4">
        <LoggerLivePanel
          devices={gnssLoggers}
          title="Telemetry Logger GNSS"
          description="Nilai parameter terbaru dari setiap logger. Atur parameter yang tampil di halaman Pengaturan."
        />
        <DeviceManagementPanel
          devices={devices}
          maintenanceLogs={maintenanceLogs}
          pointOptions={pointOptions}
        />
      </div>
    </AppShell>
  );
}
