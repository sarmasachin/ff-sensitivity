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

export const DEVICES_DEMO_ROWS: DeviceListRow[] = [
  {
    id: "d1",
    deviceId: "dev_8f2a91c0",
    label: "Pixel 7 · Android 14",
    brand: "Google",
    model: "Pixel 7",
    androidVersion: "14",
    appVersion: "2.4.1",
    appVersionCode: 241,
    fcmTokenMasked: "fcm_…a91c · ****8821",
    hasFcmToken: true,
    status: "ACTIVE",
    lastSeenLabel: "12 min ago",
    lastSeenHoursAgo: 0.2,
    pushEnabled: true,
    coinBalance: 420,
    note: "Healthy install. Used for push smoke tests.",
  },
  {
    id: "d2",
    deviceId: "dev_11bc44e2",
    label: "Samsung A54 · Android 13",
    brand: "Samsung",
    model: "Galaxy A54",
    androidVersion: "13",
    appVersion: "2.4.1",
    appVersionCode: 241,
    fcmTokenMasked: "fcm_…44e2 · ****1103",
    hasFcmToken: true,
    status: "ACTIVE",
    lastSeenLabel: "1h ago",
    lastSeenHoursAgo: 1,
    pushEnabled: true,
    coinBalance: 85,
    note: "High redeem activity — watch multi-account patterns.",
  },
  {
    id: "d3",
    deviceId: "dev_77c1d009",
    label: "OnePlus 11 · Android 14",
    brand: "OnePlus",
    model: "11",
    androidVersion: "14",
    appVersion: "2.3.8",
    appVersionCode: 238,
    fcmTokenMasked: "fcm_…d009 · ****4470",
    hasFcmToken: true,
    status: "STALE",
    lastSeenLabel: "9d ago",
    lastSeenHoursAgo: 216,
    pushEnabled: true,
    coinBalance: 12,
    note: "Below current min version. Soft-update candidate.",
  },
  {
    id: "d4",
    deviceId: "dev_99aa12ff",
    label: "Redmi Note 12 · Android 13",
    brand: "Xiaomi",
    model: "Redmi Note 12",
    androidVersion: "13",
    appVersion: "2.4.0",
    appVersionCode: 240,
    fcmTokenMasked: "—",
    hasFcmToken: false,
    status: "ACTIVE",
    lastSeenLabel: "3h ago",
    lastSeenHoursAgo: 3,
    pushEnabled: false,
    coinBalance: 0,
    note: "Notification permission denied — no FCM token on file.",
  },
  {
    id: "d5",
    deviceId: "dev_55ee90ab",
    label: "iQOO Neo · Android 14",
    brand: "iQOO",
    model: "Neo 7",
    androidVersion: "14",
    appVersion: "2.4.1",
    appVersionCode: 241,
    fcmTokenMasked: "fcm_…90ab · ****2299",
    hasFcmToken: true,
    status: "BLOCKED",
    lastSeenLabel: "2d ago",
    lastSeenHoursAgo: 48,
    pushEnabled: false,
    coinBalance: 960,
    note: "Blocked for redeem abuse / multi-device copy pattern.",
  },
  {
    id: "d6",
    deviceId: "dev_33bb01aa",
    label: "Motorola G84 · Android 14",
    brand: "Motorola",
    model: "moto g84",
    androidVersion: "14",
    appVersion: "2.4.1",
    appVersionCode: 241,
    fcmTokenMasked: "fcm_…01aa · ****5501",
    hasFcmToken: true,
    status: "ACTIVE",
    lastSeenLabel: "28 min ago",
    lastSeenHoursAgo: 0.5,
    pushEnabled: true,
    coinBalance: 210,
    note: "Clean device. Primary QA handset for share cards.",
  },
  {
    id: "d7",
    deviceId: "dev_emu34xx",
    label: "Emulator · API 34",
    brand: "Google",
    model: "sdk_gphone64_x86_64",
    androidVersion: "14",
    appVersion: "2.4.1",
    appVersionCode: 241,
    fcmTokenMasked: "fcm_…34xx · ****0001",
    hasFcmToken: true,
    status: "STALE",
    lastSeenLabel: "14d ago",
    lastSeenHoursAgo: 336,
    pushEnabled: true,
    coinBalance: 50,
    note: "CI / emulator token — exclude from production push blasts.",
  },
  {
    id: "d8",
    deviceId: "dev_vivo29cc",
    label: "Vivo V29 · Android 14",
    brand: "Vivo",
    model: "V29",
    androidVersion: "14",
    appVersion: "2.2.9",
    appVersionCode: 229,
    fcmTokenMasked: "fcm_…29cc · ****7712",
    hasFcmToken: true,
    status: "STALE",
    lastSeenLabel: "21d ago",
    lastSeenHoursAgo: 504,
    pushEnabled: true,
    coinBalance: 5,
    note: "Very old build. Force-update gate will catch on next open.",
  },
];

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

export function computeDeviceStats(rows: DeviceListRow[]) {
  const total = rows.length;
  const active = rows.filter((r) => r.status === "ACTIVE").length;
  const stale = rows.filter((r) => r.status === "STALE").length;
  const blocked = rows.filter((r) => r.status === "BLOCKED").length;
  const withToken = rows.filter((r) => r.hasFcmToken).length;
  const noToken = total - withToken;
  return { total, active, stale, blocked, withToken, noToken };
}
