type Props = {
  onAdd?: () => void;
};

export function PromosHeader({ onAdd }: Props) {
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
            Home banners and strips — title, order, deep link, schedule, and
            kill switch. Staff catalog control, not a toy carousel builder.
          </p>
        </div>
        {onAdd ? (
          <button
            type="button"
            onClick={onAdd}
            className="h-10 shrink-0 rounded-xl bg-white px-3.5 text-[13px] font-semibold text-slate-900 hover:bg-amber-50"
          >
            Add promo
          </button>
        ) : null}
      </div>
    </header>
  );
}
