type Props = {
  onAdd?: () => void;
  onRefresh?: () => void;
  busy?: boolean;
};

export function PromosHeader({ onAdd, onRefresh, busy = false }: Props) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 px-5 py-5 text-white sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-14 -right-8 h-48 w-48 rounded-full bg-amber-400/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 left-8 h-40 w-40 rounded-full bg-slate-400/10 blur-2xl"
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-amber-200/70 uppercase">
            Campaigns
          </p>
          <h1 className="mt-1 text-[26px] font-bold tracking-[-0.03em]">
            Promos
          </h1>
          <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-white/80">
            Live Nest home banners and strips — add, edit, order, and kill
            switch persist immediately. Android home syncs on next open.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              disabled={busy}
              className="h-10 rounded-xl border border-white/20 bg-white/10 px-3.5 text-[13px] font-semibold text-white/90 hover:bg-white/15 disabled:opacity-40"
            >
              Refresh
            </button>
          ) : null}
          {onAdd ? (
            <button
              type="button"
              onClick={onAdd}
              disabled={busy}
              className="h-10 shrink-0 rounded-xl bg-white px-3.5 text-[13px] font-semibold text-slate-900 hover:bg-amber-50 disabled:opacity-40"
            >
              Add promo
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
