import { apiFetch } from "@/lib/api";
import type { DeviceListRow } from "./devices-data";

// --- Start: Devices live wire (Sachin) ---
export async function fetchDevices(): Promise<DeviceListRow[]> {
  const data = await apiFetch<{ devices: DeviceListRow[] }>(
    "/api/v1/admin/devices",
  );
  return data.devices ?? [];
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
