export type UserAccountStatus = "ACTIVE" | "RESTRICTED" | "SUSPENDED" | "DELETED";

export type UserListRow = {
  id: string;
  displayName: string;
  googleName: string;
  photoUrl: string | null;
  email: string;
  googleSubMasked: string;
  status: UserAccountStatus;
  joinedLabel: string;
  lastActiveLabel: string;
  /** Hours since last activity — filter helper. */
  lastActiveHoursAgo: number;
  deviceId: string;
  deviceLabel: string;
  appVersion: string;
  coinBalance: number;
  streakDays: number;
  claimsCount: number;
  redeemUnlocks: number;
  ffUid: string;
  playRole: string;
  regionLabel: string;
  notifyPush: boolean;
  note: string;
};

export const USER_STATUS_LABEL: Record<UserAccountStatus, string> = {
  ACTIVE: "Active",
  RESTRICTED: "Restricted",
  SUSPENDED: "Suspended",
  DELETED: "Deleted",
};

export const USERS_CAPABILITIES = [
  {
    title: "Google identity",
    body: "Display name, masked email, and masked Google subject from Sign-In.",
  },
  {
    title: "Linked device",
    body: "Primary handset id, model, and app build from DeviceInstall heartbeat.",
  },
  {
    title: "Economy snapshot",
    body: "Coin balance plus claim counts for ops triage without opening Wallets.",
  },
  {
    title: "Account status",
    body: "Active, restricted (redeem paused), suspended (login blocked), or deleted (data wiped). Soft-deleted seats are removed after 90 days; admin Gmail bans stay blocked.",
  },
  {
    title: "Module ACL",
    body: "Users desk requires AdminModule.users. Viewers are read-only.",
  },
  {
    title: "Live Nest wire",
    body: "Rows load from GET /api/v1/admin/users — no demo seats.",
  },
] as const;

export type UserDeskStats = {
  total: number;
  active: number;
  restricted: number;
  suspended: number;
  deleted: number;
  coinsHeld: number;
};

export const EMPTY_USER_STATS: UserDeskStats = {
  total: 0,
  active: 0,
  restricted: 0,
  suspended: 0,
  deleted: 0,
  coinsHeld: 0,
};

export function computeUserStats(rows: UserListRow[]): UserDeskStats {
  const total = rows.length;
  const active = rows.filter((r) => r.status === "ACTIVE").length;
  const restricted = rows.filter((r) => r.status === "RESTRICTED").length;
  const suspended = rows.filter((r) => r.status === "SUSPENDED").length;
  const deleted = rows.filter((r) => r.status === "DELETED").length;
  const coinsHeld = rows.reduce((sum, r) => sum + r.coinBalance, 0);
  return { total, active, restricted, suspended, deleted, coinsHeld };
}
