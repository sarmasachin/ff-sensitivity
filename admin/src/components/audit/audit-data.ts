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
