type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
};

export function ShopPagination({ page, pageSize, total, onPage }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  if (total === 0) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[12px] text-slate-500">
        Showing{" "}
        <span className="font-semibold text-slate-800 tabular-nums">
          {from}–{to}
        </span>{" "}
        of{" "}
        <span className="font-semibold text-slate-800 tabular-nums">{total}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPage(safePage - 1)}
          className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Prev
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPage(n)}
            className={[
              "inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-[12px] font-semibold",
              n === safePage
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            ].join(" ")}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPage(safePage + 1)}
          className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
