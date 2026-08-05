type Props = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
};

export function UsersPagination({
  page,
  totalPages,
  total,
  pageSize,
  onPage,
}: Props) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[12px] text-slate-500">
        Showing{" "}
        <span className="font-semibold text-slate-700">
          {from}–{to}
        </span>{" "}
        of <span className="font-semibold text-slate-700">{total}</span> users
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Prev
        </button>
        <span className="text-[12px] font-medium tabular-nums text-slate-600">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
