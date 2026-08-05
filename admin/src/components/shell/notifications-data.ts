export type OpsNotificationKind =
  | "support"
  | "redeem"
  | "wallet"
  | "push"
  | "device"
  | "system";

export type OpsNotification = {
  id: string;
  kind: OpsNotificationKind;
  title: string;
  body: string;
  time: string;
  href: string;
  read: boolean;
};

export const OPS_NOTIFICATION_SEED: OpsNotification[] = [
  {
    id: "n1",
    kind: "support",
    title: "New P1 support ticket",
    body: "Redeem code not credited — t-1042 waiting 14m.",
    time: "2m ago",
    href: "/support",
    read: false,
  },
  {
    id: "n2",
    kind: "redeem",
    title: "Low stock alert",
    body: "37 redeem SKUs below threshold. Review inventory.",
    time: "18m ago",
    href: "/redeem",
    read: false,
  },
  {
    id: "n3",
    kind: "wallet",
    title: "Large wallet grant",
    body: "admin granted 500 coins — confirm if unexpected.",
    time: "1h ago",
    href: "/wallets",
    read: false,
  },
  {
    id: "n4",
    kind: "push",
    title: "Push campaign finished",
    body: "Promo blast delivered to 12.4k devices.",
    time: "3h ago",
    href: "/push",
    read: true,
  },
  {
    id: "n5",
    kind: "device",
    title: "Device blocked",
    body: "Fingerprint flagged for abuse — token revoked.",
    time: "5h ago",
    href: "/devices",
    read: true,
  },
  {
    id: "n6",
    kind: "system",
    title: "Claims spike",
    body: "Claims volume +22% vs yesterday (demo signal).",
    time: "Yesterday",
    href: "/dashboard",
    read: true,
  },
];

export const NOTIFICATION_KIND_STYLE: Record<
  OpsNotificationKind,
  { label: string; className: string }
> = {
  support: {
    label: "Support",
    className: "border-rose-200 bg-rose-50 text-rose-800",
  },
  redeem: {
    label: "Redeem",
    className: "border-amber-200 bg-amber-50 text-amber-900",
  },
  wallet: {
    label: "Wallet",
    className: "border-teal-200 bg-teal-50 text-teal-800",
  },
  push: {
    label: "Push",
    className: "border-cyan-200 bg-cyan-50 text-cyan-800",
  },
  device: {
    label: "Device",
    className: "border-indigo-200 bg-indigo-50 text-indigo-800",
  },
  system: {
    label: "System",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  },
};

export function countUnread(items: OpsNotification[]): number {
  return items.filter((n) => !n.read).length;
}
