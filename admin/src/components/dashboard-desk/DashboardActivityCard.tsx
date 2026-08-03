import Link from "next/link";
import type { DashActivity } from "./dashboard-data";

type Props = {
  rows: DashActivity[];
};

export function DashboardActivityCard({ rows }: Props) {
  return (
    <section className="rounded-2xl border border-[#e8eaee] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
            Feed
          </p>
          <h2 className="mt-0.5 text-[15px] font-semibold text-[#0f172a]">
            Recent ops activity
          </h2>
          <p className="mt-0.5 text-[12px] text-slate-500">
            Local demo trail — full history lives under Audit.
          </p>
        </div>
        <Link
          href="/audit"
          className="text-[12px] font-semibold text-sky-700 hover:text-sky-900"
        >
          Open Audit →
        </Link>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-semibold tracking-[0.06em] text-slate-400 uppercase">
              <th className="pb-2 pr-3 font-semibold">Time</th>
              <th className="pb-2 pr-3 font-semibold">Actor</th>
              <th className="pb-2 pr-3 font-semibold">Action</th>
              <th className="pb-2 font-semibold">Module</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-slate-50 last:border-0"
              >
                <td className="py-2.5 pr-3 font-medium text-slate-500 tabular-nums">
                  {row.time}
                </td>
                <td className="py-2.5 pr-3 text-slate-700">{row.actor}</td>
                <td className="py-2.5 pr-3 text-slate-800">{row.action}</td>
                <td className="py-2.5">
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                    {row.module}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
