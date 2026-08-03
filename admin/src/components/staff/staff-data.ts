export type StaffRole = "SUPER_ADMIN" | "ADMIN" | "SUB_ADMIN" | "VIEWER";

export type StaffStatus = "ACTIVE" | "DISABLED" | "INVITED";

export type StaffModuleId =
  | "redeem"
  | "shop"
  | "economy"
  | "community"
  | "claims"
  | "challenge"
  | "scratch"
  | "names"
  | "support"
  | "promos"
  | "push"
  | "ads"
  | "app"
  | "devices"
  | "wallets"
  | "copy"
  | "staff"
  | "audit"
  | "settings";

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
  { id: "economy", label: "Economy", group: "app" },
  { id: "community", label: "Community", group: "app" },
  { id: "claims", label: "Claims", group: "app" },
  { id: "challenge", label: "Challenge", group: "app" },
  { id: "scratch", label: "Scratch", group: "app" },
  { id: "names", label: "Names", group: "app" },
  { id: "support", label: "Support", group: "app" },
  { id: "promos", label: "Promos", group: "app" },
  { id: "push", label: "Push", group: "system" },
  { id: "ads", label: "Ads", group: "system" },
  { id: "app", label: "App", group: "system" },
  { id: "devices", label: "Devices", group: "system" },
  { id: "wallets", label: "Wallets", group: "system" },
  { id: "copy", label: "Copy", group: "system" },
  { id: "staff", label: "Staff", group: "system" },
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
    return ALL_MODULE_IDS.filter(
      (id) => id !== "staff" && id !== "settings" && id !== "audit",
    );
  }
  return [
    "redeem",
    "claims",
    "support",
    "community",
    "promos",
    "devices",
  ];
}

export const STAFF_DEMO_ROWS: StaffListRow[] = [
  {
    id: "s1",
    name: "Naveen Root",
    email: "admin@sensitivitysettings.com",
    role: "SUPER_ADMIN",
    status: "ACTIVE",
    modules: [...ALL_MODULE_IDS],
    lastLoginLabel: "12 min ago",
    invitedAtLabel: "2024-11-02",
    note: "Owner account. Can invite any role including Super Admin peers.",
  },
  {
    id: "s2",
    name: "Priya Ops",
    email: "priya@sensitivitysettings.com",
    role: "ADMIN",
    status: "ACTIVE",
    modules: [...ALL_MODULE_IDS],
    lastLoginLabel: "1h ago",
    invitedAtLabel: "2025-01-14",
    note: "Full module access. Cannot create Super Admin seats.",
  },
  {
    id: "s3",
    name: "Arjun Claims",
    email: "arjun@sensitivitysettings.com",
    role: "SUB_ADMIN",
    status: "ACTIVE",
    modules: defaultModulesForRole("SUB_ADMIN"),
    lastLoginLabel: "3h ago",
    invitedAtLabel: "2025-03-08",
    note: "Day-to-day redeem, claims, support. No staff/settings.",
  },
  {
    id: "s4",
    name: "Meera Support",
    email: "meera@sensitivitysettings.com",
    role: "SUB_ADMIN",
    status: "ACTIVE",
    modules: ["support", "claims", "community", "redeem"],
    lastLoginLabel: "Yesterday",
    invitedAtLabel: "2025-04-22",
    note: "Support-focused module set.",
  },
  {
    id: "s5",
    name: "Kabir Viewer",
    email: "kabir@sensitivitysettings.com",
    role: "VIEWER",
    status: "ACTIVE",
    modules: defaultModulesForRole("VIEWER"),
    lastLoginLabel: "2d ago",
    invitedAtLabel: "2025-06-01",
    note: "Read-only. Cannot mutate wallets, push send, or staff.",
  },
  {
    id: "s6",
    name: "Sana Invite",
    email: "sana@sensitivitysettings.com",
    role: "VIEWER",
    status: "INVITED",
    modules: defaultModulesForRole("VIEWER"),
    lastLoginLabel: "Never",
    invitedAtLabel: "2026-08-01",
    note: "Invite pending — password not set yet.",
  },
  {
    id: "s7",
    name: "Rohit Disabled",
    email: "rohit@sensitivitysettings.com",
    role: "SUB_ADMIN",
    status: "DISABLED",
    modules: ["redeem", "shop", "economy"],
    lastLoginLabel: "21d ago",
    invitedAtLabel: "2025-02-11",
    note: "Disabled after contractor offboarding.",
  },
  {
    id: "s8",
    name: "Isha Ads",
    email: "isha@sensitivitysettings.com",
    role: "SUB_ADMIN",
    status: "ACTIVE",
    modules: ["ads", "promos", "push", "copy", "app"],
    lastLoginLabel: "5h ago",
    invitedAtLabel: "2025-07-19",
    note: "Growth / ads operator.",
  },
];

export const STAFF_CAPABILITIES = [
  {
    title: "Invite",
    body: "Super Admin creates Admin / Sub-Admin / Viewer seats with email + role. Invite link expires.",
  },
  {
    title: "Roles",
    body: "Super Admin · Admin · Sub-Admin · Viewer — send/mutate gates follow role, not just UI hide.",
  },
  {
    title: "Module assign",
    body: "Per-account module ACL. Viewers see allowed modules read-only; writers need Sub-Admin+.",
  },
  {
    title: "Disable",
    body: "Immediately revoke sessions without deleting audit history for that email.",
  },
  {
    title: "Resend invite",
    body: "Pending invites can be resent. Active accounts use password reset instead.",
  },
  {
    title: "Nest auth",
    body: "Wire to Nest staff table + JWT claims next. UI is a local demo draft.",
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
