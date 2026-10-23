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
  scratch: number;
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

export const DASH_RANGE_TABS: {
  id: DashRangeId;
  label: string;
  hint: string;
}[] = [
  { id: "today", label: "Today", hint: "UTC 4h" },
  { id: "7d", label: "7 days", hint: "UTC daily" },
  { id: "30d", label: "30 days", hint: "UTC daily" },
];

export const DASH_CAPABILITIES = [
  {
    title: "Live KPIs",
    body: "Active codes and low stock are current. Claims, push deliveries, and wallet net follow the selected UTC window.",
  },
  {
    title: "Claims vs scratch",
    body: "Claims are redeem-claim rows. Scratch is redeem scratch rolls. Today is six 4-hour UTC buckets.",
  },
  {
    title: "Redeem pool",
    body: "Active means stock above 10. Low stock is 1–10. Out of stock, paused, exhausted, and expired are separate. This is current stock, not the date range.",
  },
  {
    title: "Claim outcomes",
    body: "Claimed vs flagged in the selected window. A claim is flagged only when staff marks it.",
  },
  {
    title: "Support queue",
    body: "Open and awaiting-staff threads. P1 is unread, P2 is open and read, P3 is awaiting staff.",
  },
  {
    title: "Audit feed",
    body: "Latest 10 staff audit rows. Full history stays on Audit.",
  },
];

export function emptyDashSnapshot(): DashSnapshot {
  return {
    kpis: {
      activeCodes: 0,
      claimsToday: 0,
      lowStock: 0,
      pendingSupport: 0,
      pushSends: 0,
      walletNet: 0,
    },
    trend: [],
    inventory: [],
    claimsMix: [],
    support: [],
    wallet: [],
    activity: [],
    refreshedAt: "",
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
