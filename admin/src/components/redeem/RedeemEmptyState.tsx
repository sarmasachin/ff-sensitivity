type Props = {
  kind: "inventory" | "filter";
  onAdd?: () => void;
  onClearFilter?: () => void;
};

export function RedeemEmptyState({ kind, onAdd, onClearFilter }: Props) {
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
          No codes match
        </h3>
        <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-slate-500">
          Try another filter or clear search to see your inventory again.
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
    <div className="rounded-2xl border border-dashed border-indigo-200 bg-gradient-to-b from-indigo-50/80 to-white px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/25">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 8h16v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M4 8 6.5 4h11L20 8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h3 className="mt-5 text-[18px] font-bold tracking-[-0.02em] text-slate-900">
        No redeem codes yet
      </h3>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-slate-500">
        Add a real gift code. It is saved to the database and shows on the
        Android redeem tab after the next catalog load.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-6 h-11 rounded-xl bg-indigo-600 px-5 text-[13px] font-semibold text-white hover:bg-indigo-500"
      >
        Add first code
      </button>
    </div>
  );
}
