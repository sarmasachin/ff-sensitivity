type Props = {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPage: (p: number) => void;
};

export function PromosPagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPage,
}: Props) {
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#e8eaee] bg-white px-4 py-3 text-[12px] text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <span>
        Showing {from}–{to} of {totalItems}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="h-8 rounded-lg border border-slate-200 bg-white px-3 font-semibold text-slate-700 enabled:hover:bg-slate-50 disabled:opacity-40"
        >
          Prev
        </button>
        <span className="tabular-nums text-slate-700">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="h-8 rounded-lg border border-slate-200 bg-white px-3 font-semibold text-slate-700 enabled:hover:bg-slate-50 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
