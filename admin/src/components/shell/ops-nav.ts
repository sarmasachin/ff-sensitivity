export type OpsNavHref =
  | "/dashboard"
  | "/dash"
  | "/redeem"
  | "/shop"
  | "/economy"
  | "/community"
  | "/claims"
  | "/daily-challenge"
  | "/scratch"
  | "/names"
  | "/support"
  | "/promos"
  | "/push"
  | "/ads"
  | "/app"
  | "/devices"
  | "/wallets"
  | "/users"
  | "/copy"
  | "/staff"
  | "/audit"
  | "/settings"
  | "/profile";

export type OpsNavItem = {
  href: OpsNavHref;
  label: string;
};

/** App content & engagement — opens inside the shell. */
export const OPS_NAV_PRIMARY: OpsNavItem[] = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dash", label: "Dashboard" },
  { href: "/redeem", label: "Redeem" },
  { href: "/shop", label: "Shop" },
  { href: "/economy", label: "Economy" },
  { href: "/community", label: "Community" },
  { href: "/claims", label: "Claims" },
  { href: "/daily-challenge", label: "Challenge" },
  { href: "/scratch", label: "Scratch" },
  { href: "/names", label: "Names" },
  { href: "/support", label: "Support" },
  { href: "/promos", label: "Promos" },
];

/** Remote control + staff. */
export const OPS_NAV_SYSTEM: OpsNavItem[] = [
  { href: "/profile", label: "Profile" },
  { href: "/push", label: "Push" },
  { href: "/ads", label: "Ads" },
  { href: "/app", label: "App" },
  { href: "/devices", label: "Devices" },
  { href: "/wallets", label: "Wallets" },
  { href: "/users", label: "Users" },
  { href: "/copy", label: "Copy" },
  { href: "/staff", label: "Staff" },
  { href: "/audit", label: "Audit" },
  { href: "/settings", label: "Settings" },
];
