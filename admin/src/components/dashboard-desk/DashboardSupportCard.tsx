import Link from "next/link";
import type { DashSupportRow } from "./dashboard-data";

type Props = {
  rows: DashSupportRow[];
};

const PRI: Record<
  DashSupportRow["priority"],
  string
> = {
  P1: "border-rose-200 bg-rose-50 text-rose-800",
  P2: "border-amber-200 bg-amber-50 text-amber-900",
  P3: "border-slate-200 bg-slate-50 text-slate-600",
};

export function DashboardSupportCard({ rows }: Props) {
  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-rose-700/70 uppercase">
            Queue
          </p>
          <h2 className="mt-0.5 text-[15px] font-semibold text-[#0f172a]">
            Pending support
          </h2>
          <p className="mt-0.5 text-[12px] text-slate-500">
            Highest priority open tickets.
          </p>
        </div>
        <Link
          href="/support"
          className="text-[12px] font-semibold text-sky-700 hover:text-sky-900"
        >
          Open Support →
        </Link>
      </div>

      <ul className="mt-4 divide-y divide-slate-100">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-slate-800">
                {row.subject}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400 tabular-nums">
                {row.id} · {row.age}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${PRI[row.priority]}`}
            >
              {row.priority}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
