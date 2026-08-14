import {
  PROMO_PLACEMENT_LABEL,
  PROMO_STATUS_CLASS,
  PROMO_STATUS_LABEL,
  isEndingSoon,
  resolvePromoStatus,
  type PromoRow,
} from "./promo-data";

type Props = {
  rows: PromoRow[];
  busy?: boolean;
  onEdit: (id: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
};

const btn =
  "h-8 rounded-lg px-2.5 text-[12px] font-semibold transition-colors";

export function PromosTable({
  rows,
  busy = false,
  onEdit,
  onToggle,
  onDelete,
  onMove,
}: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e8eaee] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/90 text-[11px] font-semibold tracking-[0.06em] text-slate-500 uppercase">
              <th className="px-4 py-3 w-16">Order</th>
              <th className="px-4 py-3">Promo</th>
              <th className="px-4 py-3">Placement</th>
              <th className="px-4 py-3">Schedule</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const status = resolvePromoStatus(row);
              const ending = isEndingSoon(row);
              return (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col items-start gap-1">
                      <span className="tabular-nums font-semibold text-slate-900">
                        #{row.sortOrder}
                      </span>
                      <div className="flex gap-0.5">
                        <button
                          type="button"
                          aria-label={`Move ${row.title} up`}
                          disabled={busy}
                          onClick={() => onMove(row.id, -1)}
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label={`Move ${row.title} down`}
                          disabled={busy}
                          onClick={() => onMove(row.id, 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-slate-900">{row.title}</p>
                    <p className="mt-0.5 max-w-[280px] truncate text-[12px] text-slate-500">
                      {row.subtitle || "—"}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-slate-400">
                      {row.deepLink}
                    </p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-slate-800">
                      {PROMO_PLACEMENT_LABEL[row.placement]}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                      {row.imageLabel}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 tabular-nums text-[12px] text-slate-600">
                    <p>{row.startsAt}</p>
                    <p className="text-slate-400">→ {row.endsAt}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      <span
                        className={[
                          "inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1",
                          PROMO_STATUS_CLASS[status],
                        ].join(" ")}
                      >
                        {PROMO_STATUS_LABEL[status]}
                      </span>
                      {ending ? (
                        <span className="inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-200">
                          Ending soon
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onEdit(row.id)}
                        className={`${btn} bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onToggle(row.id)}
                        className={`${btn} bg-amber-50 text-amber-900 hover:bg-amber-100 disabled:opacity-40`}
                      >
                        {row.enabled ? "Disable" : "Enable"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onDelete(row.id)}
                        className={`${btn} bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-40`}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
