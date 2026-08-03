type Props = {
  onInvite?: () => void;
  onRefresh?: () => void;
};

export function StaffHeader({ onInvite, onRefresh }: Props) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-gradient-to-r from-zinc-950 via-stone-900 to-zinc-950 px-5 py-5 text-white sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-14 -right-10 h-48 w-48 rounded-full bg-rose-500/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 left-10 h-40 w-40 rounded-full bg-zinc-400/10 blur-2xl"
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-rose-200/60 uppercase">
            Access
          </p>
          <h1 className="mt-1 text-[26px] font-bold tracking-[-0.03em]">
            Staff
          </h1>
          <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-white/80">
            Invite Admin / Sub-Admin / Viewer, assign modules, and disable
            accounts. Create is Super Admin only — access control desk, not a
            toy user list.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              className="h-10 rounded-xl border border-white/20 bg-white/10 px-3.5 text-[13px] font-medium text-white backdrop-blur-sm hover:bg-white/15"
            >
              Refresh
            </button>
          ) : null}
          {onInvite ? (
            <button
              type="button"
              onClick={onInvite}
              className="h-10 rounded-xl bg-white px-3.5 text-[13px] font-semibold text-zinc-900 hover:bg-zinc-100"
            >
              Invite staff
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
