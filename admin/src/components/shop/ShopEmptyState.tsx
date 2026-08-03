type Props = {
  kind: "inventory" | "filter";
  onAdd?: () => void;
  onClearFilter?: () => void;
};

export function ShopEmptyState({ kind, onAdd, onClearFilter }: Props) {
  if (kind === "filter") {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="M16.5 16.5 20 20"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h3 className="mt-4 text-[16px] font-semibold text-slate-900">
          No items match
        </h3>
        <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-slate-500">
          Try another category or clear search to see the full catalog.
        </p>
        <button
          type="button"
          onClick={onClearFilter}
          className="mt-5 h-10 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-800 hover:bg-slate-50"
        >
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-amber-200 bg-gradient-to-b from-amber-50/80 to-white px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/25">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 9h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M8 9V7a4 4 0 0 1 8 0v2"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <h3 className="mt-5 text-[18px] font-bold tracking-[-0.02em] text-slate-900">
        No shop items yet
      </h3>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-slate-500">
        Add your first coin-shop product — boosts, prizes, packs, or cosmetics
        for the Android Coin Shop tab.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-6 h-11 rounded-xl bg-amber-600 px-5 text-[13px] font-semibold text-white hover:bg-amber-500"
      >
        Add first item
      </button>
    </div>
  );
}
