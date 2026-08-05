export type UserAccountStatus = "ACTIVE" | "RESTRICTED" | "SUSPENDED";

export type UserListRow = {
  id: string;
  displayName: string;
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
  claimsCount: number;
  redeemUnlocks: number;
  regionLabel: string;
  note: string;
};

export const USER_STATUS_LABEL: Record<UserAccountStatus, string> = {
  ACTIVE: "Active",
  RESTRICTED: "Restricted",
  SUSPENDED: "Suspended",
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
    body: "Active, restricted (redeem paused), or suspended (JWT + login blocked).",
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

export function computeUserStats(rows: UserListRow[]) {
  const total = rows.length;
  const active = rows.filter((r) => r.status === "ACTIVE").length;
  const restricted = rows.filter((r) => r.status === "RESTRICTED").length;
  const suspended = rows.filter((r) => r.status === "SUSPENDED").length;
  const coinsHeld = rows.reduce((sum, r) => sum + r.coinBalance, 0);
  return { total, active, restricted, suspended, coinsHeld };
}
