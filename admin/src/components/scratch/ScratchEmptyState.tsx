type Props = {
  kind: "inventory" | "filter";
  onAdd?: () => void;
  onClearFilter?: () => void;
};

export function ScratchEmptyState({ kind, onAdd, onClearFilter }: Props) {
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
          No prizes match
        </h3>
        <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-slate-500">
          Try another kind filter or clear search to see the full prize table.
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
    <div className="rounded-2xl border border-dashed border-fuchsia-200 bg-gradient-to-b from-fuchsia-50/80 to-white px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/25">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect
            x="4"
            y="6"
            width="16"
            height="12"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M4 10h16"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <h3 className="mt-5 text-[18px] font-bold tracking-[-0.02em] text-slate-900">
        No scratch prizes yet
      </h3>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-slate-500">
        Add gift-pool outcomes, milestone cards, or redeem/shop foil templates
        for the Android Scratch Cards flow.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-6 h-11 rounded-xl bg-fuchsia-600 px-5 text-[13px] font-semibold text-white hover:bg-fuchsia-500"
      >
        Add first prize
      </button>
    </div>
  );
}
