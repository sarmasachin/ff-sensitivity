type Props = {
  kind: "queue" | "filter";
  onClearFilter?: () => void;
};

export function DevicesEmptyState({ kind, onClearFilter }: Props) {
  if (kind === "filter") {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
        <p className="text-[15px] font-semibold text-slate-900">No matches</p>
        <p className="mt-1 text-[13px] text-slate-500">
          Try another filter or clear search.
        </p>
        {onClearFilter ? (
          <button
            type="button"
            onClick={onClearFilter}
            className="mt-4 h-9 rounded-xl bg-slate-900 px-4 text-[13px] font-semibold text-white hover:bg-slate-800"
          >
            Clear filters
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
      <p className="text-[15px] font-semibold text-slate-900">
        No devices registered
      </p>
      <p className="mx-auto mt-1 max-w-sm text-[13px] text-slate-500">
        Rows appear after Android installs check in with a stable device id and
        optional FCM token.
      </p>
    </div>
  );
}
