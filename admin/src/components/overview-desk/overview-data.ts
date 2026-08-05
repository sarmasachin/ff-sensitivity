/** Live Overview KPI types + desk helpers (Nest GET /admin/overview). */

export type OverviewUsers = {
  total: number;
  newToday: number;
  new7d: number;
  active: number;
  restricted: number;
  suspended: number;
  loggedIn7d: number;
};

export type OverviewDevices = {
  total: number;
  active72h: number;
  stale: number;
  blocked: number;
  pushActive7d: number;
};

export type OverviewRedeem = {
  activeCodes: number;
  lowStock: number;
};

export type OverviewToday = {
  claims: number;
  scratch: number;
  walletNet: number;
  pendingSupport: number;
};

export type OverviewTopEvent = {
  name: string;
  count: number;
};

export type OverviewEngagement = {
  dauToday: number;
  mau30d: number;
  eventsToday: number;
  logoutToday: number;
  topEvents: OverviewTopEvent[];
};

export type OverviewFunnel = {
  installsToday: number;
  firstOpenToday: number;
  signupsToday: number;
  firstClaimsToday: number;
};

export type OverviewP3 = {
  screenTime: {
    trackedUsersToday: number;
    screenVisitsToday: number;
    screenTimeTodaySeconds: number;
    avgScreenSeconds: number;
    topScreens: Array<{
      screen: string;
      seconds: number;
      visits: number;
    }>;
  };
  installHealth: {
    suspectedUninstalls: number;
    registeredWithoutOpenEvent: number;
    stale72h: number;
  };
  crashReporting: {
    provider: "firebase_crashlytics";
    liveKpiAvailable: false;
    dashboardUrl: string;
  };
};

export type OverviewMeta = {
  staleHours: number;
  pushActiveDays: number;
  lowStockMax: number;
  dayBasis: string;
};

export type OverviewSnapshot = {
  users: OverviewUsers;
  devices: OverviewDevices;
  redeem: OverviewRedeem;
  today: OverviewToday;
  engagement: OverviewEngagement;
  funnel: OverviewFunnel;
  p3: OverviewP3;
  meta: OverviewMeta;
  refreshedAt: string;
};

/** Live trend series — Nest GET /admin/overview/series?range= */
export type OverviewSeriesRange = "7d" | "30d";

export type OverviewSeriesPoint = {
  day: string;
  label: string;
  dau: number;
  claims: number;
  signups: number;
  screenVisits: number;
};

export type OverviewSeriesFunnel = {
  installs: number;
  firstOpen: number;
  signups: number;
  firstClaims: number;
};

export type OverviewSeriesScreen = {
  screen: string;
  seconds: number;
  visits: number;
};

export type OverviewSeries = {
  range: OverviewSeriesRange;
  dayBasis: string;
  points: OverviewSeriesPoint[];
  funnel: OverviewSeriesFunnel;
  topScreens: OverviewSeriesScreen[];
  refreshedAt: string;
};

export const OVERVIEW_RANGE_TABS: Array<{
  id: OverviewSeriesRange;
  label: string;
  hint: string;
}> = [
  { id: "7d", label: "7 days", hint: "UTC daily" },
  { id: "30d", label: "30 days", hint: "UTC daily" },
];

export type OverviewLink = {
  href: string;
  label: string;
  hint: string;
  group: "pulse" | "app" | "system";
};

/** One-place deep links so ops never hunt across desks. */
export const OVERVIEW_LINKS: OverviewLink[] = [
  { href: "/users", label: "Users", hint: "Accounts · status", group: "pulse" },
  {
    href: "/devices",
    label: "Devices",
    hint: "Installs · last seen",
    group: "pulse",
  },
  {
    href: "/claims",
    label: "Claims",
    hint: "Redeem claims",
    group: "pulse",
  },
  {
    href: "/support",
    label: "Support",
    hint: "Open tickets",
    group: "pulse",
  },
  {
    href: "/wallets",
    label: "Wallets",
    hint: "Grant · revoke",
    group: "pulse",
  },
  {
    href: "/push",
    label: "Push",
    hint: "Campaigns · tokens",
    group: "pulse",
  },
  { href: "/redeem", label: "Redeem", hint: "Code inventory", group: "app" },
  { href: "/scratch", label: "Scratch", hint: "Cards · rolls", group: "app" },
  {
    href: "/daily-challenge",
    label: "Challenge",
    hint: "Daily quiz",
    group: "app",
  },
  { href: "/shop", label: "Shop", hint: "SKU catalog", group: "app" },
  {
    href: "/community",
    label: "Community",
    hint: "Posts · mod",
    group: "app",
  },
  { href: "/names", label: "Names", hint: "Frames · fonts", group: "app" },
  { href: "/promos", label: "Promos", hint: "Offers", group: "app" },
  { href: "/app", label: "App", hint: "Feature flags", group: "system" },
  { href: "/copy", label: "Copy", hint: "CMS strings", group: "system" },
  { href: "/staff", label: "Staff", hint: "Seats · ACL", group: "system" },
  { href: "/audit", label: "Audit", hint: "Staff trail", group: "system" },
  {
    href: "/settings",
    label: "Settings",
    hint: "Session · purge",
    group: "system",
  },
];

export const OVERVIEW_CAPABILITIES = [
  {
    title: "Live KPIs",
    body: "Users, devices, redeem stock, today claims/scratch/wallet net, and support backlog — all from Nest.",
  },
  {
    title: "Trend charts",
    body: "DAU vs claims over 7d / 30d, range bars, and top screens — live Nest series, SVG only (no chart library).",
  },
  {
    title: "Engagement (P1)",
    body: "DAU / MAU from app_open + home_open events. Top events, logout count, and feature tracks stay on Overview.",
  },
  {
    title: "Funnel (P2)",
    body: "UTC-day installs → first open → signups → first redeem claim. Server logout revokes JWTs via tokenVersion.",
  },
  {
    title: "Quality signals (P3)",
    body: "Bounded screen time, registered installs without opens, FCM suspected-uninstall signals, and Firebase Crashlytics.",
  },
  {
    title: "One desk",
    body: "Overview is the home pulse. Deep links open Users, Devices, Claims, Support, and every other module.",
  },
  {
    title: "UTC day window",
    body: "Today / 7d / 30d counters use UTC so e2e and ops share one clock.",
  },
  {
    title: "Read-only",
    body: "Overview never mutates data. Mutations stay on the linked desks with their own ACL.",
  },
  {
    title: "Module ACL",
    body: "Requires Overview module (or Super Admin). Assign from Staff.",
  },
];

export function emptyOverviewSeries(
  range: OverviewSeriesRange = "7d",
): OverviewSeries {
  return {
    range,
    dayBasis: "utc",
    points: [],
    funnel: { installs: 0, firstOpen: 0, signups: 0, firstClaims: 0 },
    topScreens: [],
    refreshedAt: new Date(0).toISOString(),
  };
}

export function emptyOverviewSnapshot(): OverviewSnapshot {
  return {
    users: {
      total: 0,
      newToday: 0,
      new7d: 0,
      active: 0,
      restricted: 0,
      suspended: 0,
      loggedIn7d: 0,
    },
    devices: {
      total: 0,
      active72h: 0,
      stale: 0,
      blocked: 0,
      pushActive7d: 0,
    },
    redeem: { activeCodes: 0, lowStock: 0 },
    today: { claims: 0, scratch: 0, walletNet: 0, pendingSupport: 0 },
    engagement: {
      dauToday: 0,
      mau30d: 0,
      eventsToday: 0,
      logoutToday: 0,
      topEvents: [],
    },
    funnel: {
      installsToday: 0,
      firstOpenToday: 0,
      signupsToday: 0,
      firstClaimsToday: 0,
    },
    p3: {
      screenTime: {
        trackedUsersToday: 0,
        screenVisitsToday: 0,
        screenTimeTodaySeconds: 0,
        avgScreenSeconds: 0,
        topScreens: [],
      },
      installHealth: {
        suspectedUninstalls: 0,
        registeredWithoutOpenEvent: 0,
        stale72h: 0,
      },
      crashReporting: {
        provider: "firebase_crashlytics",
        liveKpiAvailable: false,
        dashboardUrl:
          "https://console.firebase.google.com/project/ff-sesnitivity/crashlytics/app/android:com.ffsensitivity.app/issues",
      },
    },
    meta: {
      staleHours: 72,
      pushActiveDays: 7,
      lowStockMax: 10,
      dayBasis: "utc",
    },
    refreshedAt: new Date(0).toISOString(),
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

export function formatRefreshedLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime()) || d.getTime() === 0) return "—";
  return d.toLocaleString();
}
