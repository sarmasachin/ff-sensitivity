type Props = {
  refreshedAt: string;
  onRefresh?: () => void;
};

export function DashboardHeader({ refreshedAt, onRefresh }: Props) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-sky-900/40 bg-gradient-to-r from-slate-950 via-slate-900 to-sky-950 px-5 py-5 text-white sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-14 -right-10 h-48 w-48 rounded-full bg-sky-400/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 left-10 h-40 w-40 rounded-full bg-indigo-400/10 blur-2xl"
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-sky-200/70 uppercase">
            Live ops
          </p>
          <h1 className="mt-1 text-[26px] font-bold tracking-[-0.03em]">
            Dashboard
          </h1>
          <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-white/80">
            Claims, redeem inventory, support backlog, push volume, and wallet
            flow — operational pulse for staff, not a marketing wallpaper.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <p className="text-[11px] text-white/55 tabular-nums">
            Demo snapshot · {refreshedAt}
          </p>
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              className="h-10 rounded-xl bg-white px-3.5 text-[13px] font-semibold text-slate-900 hover:bg-sky-50"
            >
              Refresh snapshot
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
