"use client";

import { usePathname } from "next/navigation";
import { OPS_NAV_PRIMARY, OPS_NAV_SYSTEM } from "./ops-nav";
import { OpsNavLink } from "./OpsNavLink";

type Props = {
  email?: string | null;
  role?: string | null;
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

function shortEmail(email: string) {
  const local = email.split("@")[0] ?? email;
  return local.length > 18 ? `${local.slice(0, 16)}…` : local;
}

export function OpsSidebar({
  email,
  role,
  mobileOpen,
  onCloseMobile,
}: Props) {
  const pathname = usePathname();
  const initial = (email ?? "S").trim().charAt(0).toUpperCase();

  return (
    <>
      <div
        className={[
          "fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={onCloseMobile}
        aria-hidden={!mobileOpen}
      />

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex h-dvh w-[260px] shrink-0 flex-col overflow-hidden bg-[#0b1220] text-white transition-transform lg:static lg:h-full lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex h-16 shrink-0 items-center gap-3 px-5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2563eb] text-[12px] font-bold tracking-wide text-white"
            aria-hidden
          >
            FF
          </div>
          <p className="truncate text-[16px] font-semibold tracking-[-0.02em]">
            FF Sensitivity
          </p>
        </div>

        <nav className="ops-scroll-hide min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4">
          <p className="mb-2 px-3 text-[12px] font-semibold tracking-[0.14em] text-[#64748b] uppercase">
            App
          </p>
          <div className="space-y-1">
            {OPS_NAV_PRIMARY.map((item) => (
              <OpsNavLink
                key={item.href}
                href={item.href}
                label={item.label}
                active={pathname === item.href}
                onNavigate={onCloseMobile}
              />
            ))}
          </div>

          <p className="mt-5 mb-2 px-3 text-[12px] font-semibold tracking-[0.14em] text-[#64748b] uppercase">
            System
          </p>
          <div className="space-y-1">
            {OPS_NAV_SYSTEM.map((item) => (
              <OpsNavLink
                key={item.href}
                href={item.href}
                label={item.label}
                active={pathname === item.href}
                onNavigate={onCloseMobile}
              />
            ))}
          </div>
        </nav>

        <div className="shrink-0 border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1e293b] text-[13px] font-semibold text-[#e2e8f0]"
              aria-hidden
            >
              {initial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-medium text-[#e2e8f0]">
                {email ? shortEmail(email) : "Staff"}
              </p>
              <p className="mt-0.5 text-[13px] font-medium tracking-wide text-[#60a5fa] uppercase">
                {role?.replaceAll("_", " ") ?? "—"}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
