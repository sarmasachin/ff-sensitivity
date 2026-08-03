"use client";

import Link from "next/link";
import type { OpsNavHref } from "./ops-nav";
import {
  IconAds,
  IconApp,
  IconAudit,
  IconChallenge,
  IconClaims,
  IconCommunity,
  IconCopy,
  IconDash,
  IconDevices,
  IconEconomy,
  IconNames,
  IconOverview,
  IconPromos,
  IconPush,
  IconRedeem,
  IconScratch,
  IconSettings,
  IconShop,
  IconStaff,
  IconSupport,
  IconWallets,
} from "./OpsNavIcons";

const ICONS = {
  "/dashboard": IconOverview,
  "/dash": IconDash,
  "/redeem": IconRedeem,
  "/shop": IconShop,
  "/economy": IconEconomy,
  "/community": IconCommunity,
  "/claims": IconClaims,
  "/daily-challenge": IconChallenge,
  "/scratch": IconScratch,
  "/names": IconNames,
  "/support": IconSupport,
  "/promos": IconPromos,
  "/push": IconPush,
  "/ads": IconAds,
  "/app": IconApp,
  "/devices": IconDevices,
  "/wallets": IconWallets,
  "/copy": IconCopy,
  "/staff": IconStaff,
  "/audit": IconAudit,
  "/settings": IconSettings,
} as const;

type Props = {
  href: OpsNavHref;
  label: string;
  active: boolean;
  onNavigate?: () => void;
};

export function OpsNavLink({ href, label, active, onNavigate }: Props) {
  const Icon = ICONS[href];
  return (
    <Link
      href={href}
      prefetch={false}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={[
        "flex h-11 items-center gap-3 rounded-xl px-3 text-[16px] transition-colors",
        active
          ? "bg-[#2563eb] font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.35)]"
          : "font-medium text-[#94a3b8] hover:bg-white/[0.04] hover:text-[#e2e8f0]",
      ].join(" ")}
    >
      <Icon className={active ? "text-white" : "text-[#64748b]"} />
      <span className="truncate leading-none">{label}</span>
    </Link>
  );
}
