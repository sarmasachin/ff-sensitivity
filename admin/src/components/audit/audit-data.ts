export type AuditCategory =
  | "LOGIN"
  | "REDEEM"
  | "INVENTORY"
  | "STAFF"
  | "WALLET"
  | "CONFIG"
  | "DEVICE";

export type AuditResult = "SUCCESS" | "DENIED" | "FAILED";

export type AuditListRow = {
  id: string;
  atLabel: string;
  /** Sort key hours ago — lower = newer. */
  hoursAgo: number;
  actorName: string;
  actorEmail: string;
  category: AuditCategory;
  action: string;
  target: string;
  result: AuditResult;
  ipLabel: string;
  detail: string;
};

export const AUDIT_CATEGORY_LABEL: Record<AuditCategory, string> = {
  LOGIN: "Login",
  REDEEM: "Redeem",
  INVENTORY: "Inventory",
  STAFF: "Staff",
  WALLET: "Wallet",
  CONFIG: "Config",
  DEVICE: "Device",
};

export const AUDIT_RESULT_LABEL: Record<AuditResult, string> = {
  SUCCESS: "Success",
  DENIED: "Denied",
  FAILED: "Failed",
};

export const AUDIT_DEMO_ROWS: AuditListRow[] = [
  {
    id: "a1",
    atLabel: "2 min ago",
    hoursAgo: 0.03,
    actorName: "Naveen Root",
    actorEmail: "admin@sensitivitysettings.com",
    category: "LOGIN",
    action: "Session start",
    target: "ops console",
    result: "SUCCESS",
    ipLabel: "103.24.xx.14 · Chrome",
    detail: "Password login from known device. MFA not required (policy off).",
  },
  {
    id: "a2",
    atLabel: "18 min ago",
    hoursAgo: 0.3,
    actorName: "Priya Ops",
    actorEmail: "priya@sensitivitysettings.com",
    category: "REDEEM",
    action: "Code reveal",
    target: "code · FF-WEEKEND-***",
    result: "SUCCESS",
    ipLabel: "49.36.xx.88 · Chrome",
    detail: "Full secret revealed for support ticket #214. Masked list only before this.",
  },
  {
    id: "a3",
    atLabel: "42 min ago",
    hoursAgo: 0.7,
    actorName: "Arjun Claims",
    actorEmail: "arjun@sensitivitysettings.com",
    category: "INVENTORY",
    action: "Stock adjust",
    target: "pack · Daily Bundle",
    result: "SUCCESS",
    ipLabel: "103.24.xx.41 · Edge",
    detail: "Stock 12 → 20. Reason: restock after weekend campaign.",
  },
  {
    id: "a4",
    atLabel: "1h ago",
    hoursAgo: 1,
    actorName: "Naveen Root",
    actorEmail: "admin@sensitivitysettings.com",
    category: "STAFF",
    action: "Invite sent",
    target: "e2e.staff@sensitivitysettings.com",
    result: "SUCCESS",
    ipLabel: "103.24.xx.14 · Chrome",
    detail: "Role SUB_ADMIN · modules assigned (local demo invite).",
  },
  {
    id: "a5",
    atLabel: "2h ago",
    hoursAgo: 2,
    actorName: "Priya Ops",
    actorEmail: "priya@sensitivitysettings.com",
    category: "WALLET",
    action: "Grant coins",
    target: "dev_8f2a91c0 · +100",
    result: "SUCCESS",
    ipLabel: "49.36.xx.88 · Chrome",
    detail: "Staff goodwill grant — support ticket #214.",
  },
  {
    id: "a6",
    atLabel: "3h ago",
    hoursAgo: 3,
    actorName: "Kabir Viewer",
    actorEmail: "kabir@sensitivitysettings.com",
    category: "REDEEM",
    action: "Code reveal",
    target: "code · FF-STARTER-***",
    result: "DENIED",
    ipLabel: "122.16.xx.3 · Firefox",
    detail: "Viewer role cannot reveal full secrets. Request blocked at ACL.",
  },
  {
    id: "a7",
    atLabel: "5h ago",
    hoursAgo: 5,
    actorName: "Isha Ads",
    actorEmail: "isha@sensitivitysettings.com",
    category: "CONFIG",
    action: "Promo update",
    target: "promo · Weekend Challenge",
    result: "SUCCESS",
    ipLabel: "157.45.xx.9 · Chrome",
    detail: "Subtitle + deep link edited. Sort order unchanged.",
  },
  {
    id: "a8",
    atLabel: "Yesterday",
    hoursAgo: 26,
    actorName: "Naveen Root",
    actorEmail: "admin@sensitivitysettings.com",
    category: "STAFF",
    action: "Role change",
    target: "meera@sensitivitysettings.com",
    result: "SUCCESS",
    ipLabel: "103.24.xx.14 · Chrome",
    detail: "Modules narrowed to support · claims · community · redeem.",
  },
  {
    id: "a9",
    atLabel: "Yesterday",
    hoursAgo: 28,
    actorName: "Priya Ops",
    actorEmail: "priya@sensitivitysettings.com",
    category: "DEVICE",
    action: "Device block",
    target: "dev_55ee90ab",
    result: "SUCCESS",
    ipLabel: "49.36.xx.88 · Chrome",
    detail: "Blocked for redeem abuse / multi-device copy pattern.",
  },
  {
    id: "a10",
    atLabel: "2d ago",
    hoursAgo: 50,
    actorName: "system",
    actorEmail: "system@ffops",
    category: "LOGIN",
    action: "Login failed",
    target: "unknown@external.test",
    result: "FAILED",
    ipLabel: "185.22.xx.77 · curl",
    detail: "Invalid credentials ×5. Rate-limited. No account matched.",
  },
  {
    id: "a11",
    atLabel: "2d ago",
    hoursAgo: 52,
    actorName: "Arjun Claims",
    actorEmail: "arjun@sensitivitysettings.com",
    category: "WALLET",
    action: "Revoke coins",
    target: "dev_77c1d009 · −40",
    result: "SUCCESS",
    ipLabel: "103.24.xx.41 · Edge",
    detail: "Duplicate milestone payout correction.",
  },
  {
    id: "a12",
    atLabel: "3d ago",
    hoursAgo: 72,
    actorName: "Naveen Root",
    actorEmail: "admin@sensitivitysettings.com",
    category: "CONFIG",
    action: "App force-update",
    target: "min version 2.4.1",
    result: "SUCCESS",
    ipLabel: "103.24.xx.14 · Chrome",
    detail: "Force update flag toggled on. Soft prompt left on.",
  },
];

export const AUDIT_CAPABILITIES = [
  {
    title: "Immutable trail",
    body: "Append-only events. Staff cannot edit or delete rows from this console.",
  },
  {
    title: "Login & session",
    body: "Successful and failed sign-ins with IP / client hints for abuse review.",
  },
  {
    title: "Code reveal",
    body: "Full redeem secret reveals are always logged with actor + ticket context.",
  },
  {
    title: "Inventory & config",
    body: "Stock adjusts, promo edits, and remote app config changes land here.",
  },
  {
    title: "Staff & ACL",
    body: "Invites, disables, role and module changes — who changed access, when.",
  },
  {
    title: "Export",
    body: "CSV from the filtered trail — secrets already redacted by Nest.",
  },
  {
    title: "Live Nest wire",
    body: "Rows load from GET /api/v1/admin/audit — append-only, no mutate.",
  },
] as const;

export function computeAuditStats(rows: AuditListRow[]) {
  const total = rows.length;
  const today = rows.filter((r) => r.hoursAgo < 24).length;
  const logins = rows.filter((r) => r.category === "LOGIN").length;
  const denied = rows.filter((r) => r.result === "DENIED" || r.result === "FAILED").length;
  const reveals = rows.filter(
    (r) => r.category === "REDEEM" && r.action.toLowerCase().includes("reveal"),
  ).length;
  return { total, today, logins, denied, reveals };
}
