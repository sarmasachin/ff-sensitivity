type Props = {
  onSave?: () => void;
  onRefresh?: () => void;
  saving?: boolean;
  viewer?: boolean;
};

export function AdsHeader({ onSave, onRefresh, saving, viewer }: Props) {
  return (
    <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
          Monetization
        </p>
        <h1 className="mt-0.5 text-[22px] font-bold tracking-[-0.03em] text-slate-900">
          Ads
        </h1>
        <p className="mt-1 max-w-xl text-[12px] leading-snug text-slate-500">
          Placement gates including Redeem Daily and Challenge lock timing.
          Unit IDs stay in the app build.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={saving}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Refresh
          </button>
        ) : null}
        {onSave && !viewer ? (
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="h-9 rounded-lg bg-slate-900 px-3.5 text-[12px] font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        ) : null}
        {viewer ? (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
            View only
          </span>
        ) : null}
      </div>
    </header>
  );
}
