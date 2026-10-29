export type DeviceStatus = "ACTIVE" | "STALE" | "BLOCKED";

export type DeviceListRow = {
  id: string;
  deviceId: string;
  label: string;
  brand: string;
  model: string;
  androidVersion: string;
  appVersion: string;
  appVersionCode: number;
  fcmTokenMasked: string;
  hasFcmToken: boolean;
  status: DeviceStatus;
  lastSeenLabel: string;
  /** Hours since last ping — used for stale filter. */
  lastSeenHoursAgo: number;
  pushEnabled: boolean;
  coinBalance: number;
  note: string;
};

export const DEVICE_STATUS_LABEL: Record<DeviceStatus, string> = {
  ACTIVE: "Active",
  STALE: "Stale",
  BLOCKED: "Blocked",
};


export const DEVICES_CAPABILITIES = [
  {
    title: "Registry",
    body: "Stable device ids from Android install — not Google accounts. Basis for wallets, claims, and push.",
  },
  {
    title: "FCM tokens",
    body: "Masked tokens for targeting. Invalidate after uninstall or permission revoke without deleting the device row.",
  },
  {
    title: "Block / unblock",
    body: "Hard-block abusive handsets from redeem, shop, and push while keeping history for audit.",
  },
  {
    title: "Stale detection",
    body: "Surface installs that have not checked in — prune dead tokens before large campaigns.",
  },
  {
    title: "Version gate",
    body: "App version / code next to each row so force-update and soft-prompt decisions are obvious.",
  },
  {
    title: "Export",
    body: "CSV of device ids + last seen for offline review. Raw FCM tokens are never exported.",
  },
] as const;

export type DeviceDeskStats = {
  total: number;
  active: number;
  stale: number;
  blocked: number;
  withToken: number;
};

export function computeDeviceStats(rows: DeviceListRow[]) {
  const total = rows.length;
  const active = rows.filter((r) => r.status === "ACTIVE").length;
  const stale = rows.filter((r) => r.status === "STALE").length;
  const blocked = rows.filter((r) => r.status === "BLOCKED").length;
  const withToken = rows.filter((r) => r.hasFcmToken).length;
  const noToken = total - withToken;
  return { total, active, stale, blocked, withToken, noToken };
}

/** Cards follow the database totals. After block or token drop, the loaded rows take over. */
export function deviceCardStats(
  rows: DeviceListRow[],
  desk: DeviceDeskStats | null,
) {
  const live = computeDeviceStats(rows);
  if (!desk) return live;
  if (rows.length >= desk.total) return live;
  return {
    ...live,
    total: desk.total,
    active: desk.active,
    stale: desk.stale,
    blocked: desk.blocked,
    withToken: desk.withToken,
    noToken: Math.max(0, desk.total - desk.withToken),
  };
}
