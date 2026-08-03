"use client";

import { OpsNotifications } from "./OpsNotifications";

type Props = {
  onOpenMenu: () => void;
  onSignOut: () => void;
};

export function OpsTopbar({ onOpenMenu, onSignOut }: Props) {
  return (
    <header className="z-30 flex h-16 shrink-0 items-center gap-3 border-b border-[#e8eaee] bg-[#f8fafc] px-4 sm:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#e2e8f0] bg-white text-[#475569] lg:hidden"
        aria-label="Open menu"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 7h16M4 12h16M4 17h16"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <label className="relative mx-auto flex w-full max-w-[520px] items-center">
        <span className="pointer-events-none absolute left-3.5 text-[#94a3b8]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
            <path
              d="M16.5 16.5 20 20"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <input
          type="search"
          placeholder="Search modules, API keys, logs…"
          className="h-11 w-full rounded-full border-0 bg-[#eef2f7] pr-4 pl-10 text-[13px] text-[#0f172a] outline-none placeholder:text-[#94a3b8] focus:ring-2 focus:ring-[#2563eb]/25"
        />
      </label>

      <div className="flex items-center gap-2 sm:gap-3">
        <OpsNotifications />

        <button
          type="button"
          onClick={onSignOut}
          className="h-10 rounded-xl border border-[#e2e8f0] bg-white px-3.5 text-[13px] font-medium text-[#0f172a] hover:bg-[#f8fafc]"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
