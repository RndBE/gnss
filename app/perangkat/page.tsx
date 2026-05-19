import { AppShell } from "@/components/dashboard/app-shell";
import { DeviceManagementPanel } from "@/components/dashboard/device-management-panel";
import {
  getDeviceManagementItems,
  getDevicePointOptions,
  getDashboardSummary,
  getMaintenanceLogs,
} from "@/lib/backend/queries";

export const dynamic = "force-dynamic";

export default async function PerangkatPage() {
  const [summary, devices, maintenanceLogs, pointOptions] = await Promise.all([
    getDashboardSummary(),
    getDeviceManagementItems(),
    getMaintenanceLogs(),
    getDevicePointOptions(),
  ]);

  return (
    <AppShell
      activeArea={summary.activeArea}
      activePath="/perangkat"
      title="Perangkat dan Telemetry Logger"
      updatedAt={summary.updatedAt}
    >
      <DeviceManagementPanel
        devices={devices}
        maintenanceLogs={maintenanceLogs}
        pointOptions={pointOptions}
      />
    </AppShell>
  );
}
