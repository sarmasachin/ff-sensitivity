type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
};

export function DevicesPagination({ page, pageSize, total, onPage }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-slate-500">
      <p>
        Showing{" "}
        <span className="font-semibold tabular-nums text-slate-700">
          {from}–{to}
        </span>{" "}
        of{" "}
        <span className="font-semibold tabular-nums text-slate-700">{total}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="h-8 rounded-lg bg-white px-3 text-[12px] font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Prev
        </button>
        <span className="px-2 font-semibold tabular-nums text-slate-700">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="h-8 rounded-lg bg-white px-3 text-[12px] font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
