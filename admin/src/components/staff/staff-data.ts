export type StaffRole = "SUPER_ADMIN" | "ADMIN" | "SUB_ADMIN" | "VIEWER";

export type StaffStatus = "ACTIVE" | "DISABLED" | "INVITED";

/** UI module ids — `challenge` maps to Prisma `daily_challenge`. */
export type StaffModuleId =
  | "redeem"
  | "shop"
  | "community"
  | "claims"
  | "challenge"
  | "scratch"
  | "names"
  | "support"
  | "promos"
  | "push"
  | "app"
  | "devices"
  | "wallets"
  | "users"
  | "copy"
  | "staff"
  | "audit"
  | "settings"
  | "overview";

export type StaffListRow = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  status: StaffStatus;
  modules: StaffModuleId[];
  lastLoginLabel: string;
  invitedAtLabel: string;
  note: string;
};

export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  SUB_ADMIN: "Sub-Admin",
  VIEWER: "Viewer",
};

export const STAFF_STATUS_LABEL: Record<StaffStatus, string> = {
  ACTIVE: "Active",
  DISABLED: "Disabled",
  INVITED: "Invited",
};

export const STAFF_MODULE_META: {
  id: StaffModuleId;
  label: string;
  group: "app" | "system";
}[] = [
  { id: "redeem", label: "Redeem", group: "app" },
  { id: "shop", label: "Shop", group: "app" },
  { id: "community", label: "Community", group: "app" },
  { id: "claims", label: "Claims", group: "app" },
  { id: "challenge", label: "Challenge", group: "app" },
  { id: "scratch", label: "Scratch", group: "app" },
  { id: "names", label: "Names", group: "app" },
  { id: "support", label: "Support", group: "app" },
  { id: "promos", label: "Promos", group: "app" },
  { id: "push", label: "Push", group: "system" },
  { id: "app", label: "App", group: "system" },
  { id: "devices", label: "Devices", group: "system" },
  { id: "wallets", label: "Wallets", group: "system" },
  { id: "users", label: "Users", group: "system" },
  { id: "copy", label: "Copy", group: "system" },
  { id: "staff", label: "Staff", group: "system" },
  { id: "overview", label: "Overview", group: "system" },
  { id: "audit", label: "Audit", group: "system" },
  { id: "settings", label: "Settings", group: "system" },
];

export const ALL_MODULE_IDS: StaffModuleId[] = STAFF_MODULE_META.map(
  (m) => m.id,
);

/** Default modules by role for invite form. */
export function defaultModulesForRole(role: StaffRole): StaffModuleId[] {
  if (role === "SUPER_ADMIN" || role === "ADMIN") return [...ALL_MODULE_IDS];
  if (role === "SUB_ADMIN") {
    return ALL_MODULE_IDS.filter((id) => id !== "staff");
  }
  return [
    "overview",
    "redeem",
    "claims",
    "support",
    "community",
    "promos",
    "devices",
  ];
}

export const STAFF_CAPABILITIES = [
  {
    title: "Invite seats",
    body: "Create ADMIN / SUB_ADMIN / VIEWER with temp password — must change on first login.",
  },
  {
    title: "Module ACL",
    body: "Assign Nest AdminModule access. Challenge maps to daily_challenge.",
  },
  {
    title: "Disable / enable",
    body: "Soft-disable revokes sessions. Super Admin and self are protected.",
  },
  {
    title: "Resend invite",
    body: "Rotate temp password for seats that have not logged in yet.",
  },
  {
    title: "Role guards",
    body: "Only Super Admin invites Admin seats or grants the staff module.",
  },
  {
    title: "Live Nest wire",
    body: "Rows load from GET /api/v1/admin/staff — no demo seats.",
  },
] as const;

export function computeStaffStats(rows: StaffListRow[]) {
  const total = rows.length;
  const active = rows.filter((r) => r.status === "ACTIVE").length;
  const disabled = rows.filter((r) => r.status === "DISABLED").length;
  const invited = rows.filter((r) => r.status === "INVITED").length;
  const admins = rows.filter(
    (r) => r.role === "SUPER_ADMIN" || r.role === "ADMIN",
  ).length;
  return { total, active, disabled, invited, admins };
}

export function isValidStaffEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
