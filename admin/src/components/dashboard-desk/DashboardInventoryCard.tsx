import { formatCompact, type DashStatusBar } from "./dashboard-data";

type Props = {
  rows: DashStatusBar[];
};

const BAR: Record<DashStatusBar["tone"], string> = {
  emerald: "bg-emerald-500",
  sky: "bg-sky-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  slate: "bg-slate-400",
};

export function DashboardInventoryCard({ rows }: Props) {
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-emerald-700/70 uppercase">
        Inventory
      </p>
      <h2 className="mt-0.5 text-[15px] font-semibold text-[#0f172a]">
        Redeem pool status
      </h2>
      <p className="mt-0.5 text-[12px] text-slate-500">
        Active stock vs used, low, expired, held.
      </p>

      <ul className="mt-4 flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.id}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-[13px] font-medium text-slate-700">
                {row.label}
              </span>
              <span className="text-[13px] font-semibold text-slate-900 tabular-nums">
                {formatCompact(row.count)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${BAR[row.tone]}`}
                style={{ width: `${Math.max(4, (row.count / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
