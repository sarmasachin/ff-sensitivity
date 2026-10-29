import { apiFetch } from "@/lib/api";
import {
  computeDeviceStats,
  type DeviceDeskStats,
  type DeviceListRow,
} from "./devices-data";

export type { DeviceDeskStats };

// --- Start: Devices live wire (Sachin) ---
export async function fetchDevices(): Promise<{
  devices: DeviceListRow[];
  stats: DeviceDeskStats;
}> {
  const data = await apiFetch<{
    devices?: DeviceListRow[];
    stats?: DeviceDeskStats;
  }>("/api/v1/admin/devices");
  const devices = data.devices ?? [];
  const fromRows = computeDeviceStats(devices);
  const stats = data.stats ?? {
    total: fromRows.total,
    active: fromRows.active,
    stale: fromRows.stale,
    blocked: fromRows.blocked,
    withToken: fromRows.withToken,
  };
  return { devices, stats };
}

export async function blockDeviceApi(id: string): Promise<DeviceListRow> {
  const data = await apiFetch<{ device: DeviceListRow }>(
    `/api/v1/admin/devices/${encodeURIComponent(id)}/block`,
    { method: "POST", body: "{}" },
  );
  return data.device;
}

export async function unblockDeviceApi(id: string): Promise<DeviceListRow> {
  const data = await apiFetch<{ device: DeviceListRow }>(
    `/api/v1/admin/devices/${encodeURIComponent(id)}/unblock`,
    { method: "POST", body: "{}" },
  );
  return data.device;
}

export async function invalidateDeviceTokenApi(
  id: string,
): Promise<DeviceListRow> {
  const data = await apiFetch<{ device: DeviceListRow }>(
    `/api/v1/admin/devices/${encodeURIComponent(id)}/invalidate-token`,
    { method: "POST", body: "{}" },
  );
  return data.device;
}
// --- End: Devices live wire (Sachin) ---
