export type DashRangeId = "today" | "7d" | "30d";

export type DashKpis = {
  activeCodes: number;
  claimsToday: number;
  lowStock: number;
  pendingSupport: number;
  pushSends: number;
  walletNet: number;
};

export type DashPoint = {
  label: string;
  claims: number;
  redeems: number;
};

export type DashStatusBar = {
  id: string;
  label: string;
  count: number;
  tone: "emerald" | "sky" | "amber" | "rose" | "slate";
};

export type DashDonutSlice = {
  id: string;
  label: string;
  value: number;
  color: string;
};

export type DashSupportRow = {
  id: string;
  subject: string;
  priority: "P1" | "P2" | "P3";
  age: string;
};

export type DashWalletDay = {
  label: string;
  grant: number;
  revoke: number;
};

export type DashActivity = {
  id: string;
  time: string;
  actor: string;
  action: string;
  module: string;
};

export type DashSnapshot = {
  kpis: DashKpis;
  trend: DashPoint[];
  inventory: DashStatusBar[];
  claimsMix: DashDonutSlice[];
  support: DashSupportRow[];
  wallet: DashWalletDay[];
  activity: DashActivity[];
  refreshedAt: string;
};

const TREND_7D: DashPoint[] = [
  { label: "Mon", claims: 42, redeems: 38 },
  { label: "Tue", claims: 51, redeems: 44 },
  { label: "Wed", claims: 47, redeems: 41 },
  { label: "Thu", claims: 63, redeems: 55 },
  { label: "Fri", claims: 58, redeems: 49 },
  { label: "Sat", claims: 71, redeems: 62 },
  { label: "Sun", claims: 66, redeems: 58 },
];

const TREND_30D: DashPoint[] = [
  { label: "W1", claims: 280, redeems: 240 },
  { label: "W2", claims: 312, redeems: 268 },
  { label: "W3", claims: 295, redeems: 251 },
  { label: "W4", claims: 348, redeems: 302 },
];

const TREND_TODAY: DashPoint[] = [
  { label: "00", claims: 2, redeems: 1 },
  { label: "04", claims: 1, redeems: 1 },
  { label: "08", claims: 8, redeems: 6 },
  { label: "12", claims: 14, redeems: 12 },
  { label: "16", claims: 18, redeems: 15 },
  { label: "20", claims: 11, redeems: 9 },
];

const INVENTORY: DashStatusBar[] = [
  { id: "active", label: "Active", count: 1284, tone: "emerald" },
  { id: "used", label: "Used", count: 942, tone: "sky" },
  { id: "low", label: "Low stock", count: 37, tone: "amber" },
  { id: "expired", label: "Expired", count: 118, tone: "rose" },
  { id: "held", label: "Held", count: 24, tone: "slate" },
];

const CLAIMS_MIX: DashDonutSlice[] = [
  { id: "ok", label: "Success", value: 412, color: "#059669" },
  { id: "pending", label: "Pending", value: 48, color: "#d97706" },
  { id: "reject", label: "Rejected", value: 29, color: "#e11d48" },
  { id: "fail", label: "Failed", value: 17, color: "#64748b" },
];

const SUPPORT: DashSupportRow[] = [
  {
    id: "t-1042",
    subject: "Redeem code not credited",
    priority: "P1",
    age: "14m",
  },
  {
    id: "t-1041",
    subject: "Wallet balance mismatch",
    priority: "P1",
    age: "32m",
  },
  {
    id: "t-1038",
    subject: "Push not received on Android 14",
    priority: "P2",
    age: "1h",
  },
  {
    id: "t-1035",
    subject: "Shop SKU out of sync",
    priority: "P2",
    age: "2h",
  },
  {
    id: "t-1029",
    subject: "Challenge leaderboard delay",
    priority: "P3",
    age: "5h",
  },
];

const WALLET_7D: DashWalletDay[] = [
  { label: "Mon", grant: 4200, revoke: 800 },
  { label: "Tue", grant: 3800, revoke: 650 },
  { label: "Wed", grant: 5100, revoke: 920 },
  { label: "Thu", grant: 4600, revoke: 700 },
  { label: "Fri", grant: 5400, revoke: 1100 },
  { label: "Sat", grant: 6100, revoke: 980 },
  { label: "Sun", grant: 4900, revoke: 760 },
];

const ACTIVITY: DashActivity[] = [
  {
    id: "a1",
    time: "14:22",
    actor: "admin",
    action: "Granted 500 coins",
    module: "Wallets",
  },
  {
    id: "a2",
    time: "14:08",
    actor: "ops.riya",
    action: "Closed ticket t-1031",
    module: "Support",
  },
  {
    id: "a3",
    time: "13:51",
    actor: "admin",
    action: "Imported 200 redeem codes",
    module: "Redeem",
  },
  {
    id: "a4",
    time: "13:20",
    actor: "ops.kabir",
    action: "Sent promo push (12.4k)",
    module: "Push",
  },
  {
    id: "a5",
    time: "12:44",
    actor: "admin",
    action: "Blocked device fingerprint",
    module: "Devices",
  },
];

export const DASH_RANGE_TABS: {
  id: DashRangeId;
  label: string;
  hint: string;
}[] = [
  { id: "today", label: "Today", hint: "Hourly" },
  { id: "7d", label: "7 days", hint: "Daily" },
  { id: "30d", label: "30 days", hint: "Weekly" },
];

export const DASH_CAPABILITIES = [
  {
    title: "Live KPIs",
    body: "Active codes, claims, low stock, support backlog, push volume, wallet net — refreshed from Nest.",
  },
  {
    title: "Trend charts",
    body: "Claims vs redeems over today / 7d / 30d without a heavy chart library dependency.",
  },
  {
    title: "Inventory mix",
    body: "Redeem pool health: active, used, low stock, expired, held.",
  },
  {
    title: "Claims outcome",
    body: "Success / pending / rejected / failed share for the selected window.",
  },
  {
    title: "Support queue",
    body: "Highest-priority open tickets with age — deep link to Support next.",
  },
  {
    title: "Nest wire-up",
    body: "UI uses local demo snapshots now. Wire Redeem, Claims, Support, Push, Wallets feeds next.",
  },
];

function kpisFor(range: DashRangeId): DashKpis {
  if (range === "today") {
    return {
      activeCodes: 1284,
      claimsToday: 54,
      lowStock: 37,
      pendingSupport: 12,
      pushSends: 1840,
      walletNet: 9200,
    };
  }
  if (range === "30d") {
    return {
      activeCodes: 1284,
      claimsToday: 1235,
      lowStock: 37,
      pendingSupport: 12,
      pushSends: 48200,
      walletNet: 186400,
    };
  }
  return {
    activeCodes: 1284,
    claimsToday: 398,
    lowStock: 37,
    pendingSupport: 12,
    pushSends: 12400,
    walletNet: 41200,
  };
}

function trendFor(range: DashRangeId): DashPoint[] {
  if (range === "today") return TREND_TODAY.map((p) => ({ ...p }));
  if (range === "30d") return TREND_30D.map((p) => ({ ...p }));
  return TREND_7D.map((p) => ({ ...p }));
}

function walletFor(range: DashRangeId): DashWalletDay[] {
  if (range === "today") {
    return [
      { label: "AM", grant: 2100, revoke: 400 },
      { label: "PM", grant: 2800, revoke: 520 },
    ];
  }
  if (range === "30d") {
    return [
      { label: "W1", grant: 22000, revoke: 4100 },
      { label: "W2", grant: 24800, revoke: 4600 },
      { label: "W3", grant: 23100, revoke: 3900 },
      { label: "W4", grant: 27600, revoke: 5200 },
    ];
  }
  return WALLET_7D.map((d) => ({ ...d }));
}

export function buildDashSnapshot(range: DashRangeId): DashSnapshot {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return {
    kpis: kpisFor(range),
    trend: trendFor(range),
    inventory: INVENTORY.map((r) => ({ ...r })),
    claimsMix: CLAIMS_MIX.map((s) => ({ ...s })),
    support: SUPPORT.map((t) => ({ ...t })),
    wallet: walletFor(range),
    activity: ACTIVITY.map((a) => ({ ...a })),
    refreshedAt: `${hh}:${mm}`,
  };
}

export function formatCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(n) >= 1_000) {
    return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  }
  return String(n);
}
