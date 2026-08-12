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
