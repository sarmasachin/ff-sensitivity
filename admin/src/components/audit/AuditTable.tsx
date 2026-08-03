import type { ReactNode } from "react";
import {
  AUDIT_CATEGORY_LABEL,
  AUDIT_RESULT_LABEL,
  type AuditCategory,
  type AuditListRow,
  type AuditResult,
} from "./audit-data";

type Props = {
  rows: AuditListRow[];
  notice?: string | null;
  footer?: ReactNode;
  onInspect: (id: string) => void;
};

function CategoryPill({ category }: { category: AuditCategory }) {
  const map: Record<AuditCategory, string> = {
    LOGIN: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    REDEEM: "bg-amber-100 text-amber-900 ring-amber-200",
    INVENTORY: "bg-sky-100 text-sky-900 ring-sky-200",
    STAFF: "bg-rose-100 text-rose-900 ring-rose-200",
    WALLET: "bg-teal-100 text-teal-900 ring-teal-200",
    CONFIG: "bg-violet-100 text-violet-900 ring-violet-200",
    DEVICE: "bg-indigo-100 text-indigo-900 ring-indigo-200",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${map[category]}`}
    >
      {AUDIT_CATEGORY_LABEL[category]}
    </span>
  );
}

function ResultPill({ result }: { result: AuditResult }) {
  const map: Record<AuditResult, string> = {
    SUCCESS: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    DENIED: "bg-amber-100 text-amber-900 ring-amber-200",
    FAILED: "bg-rose-100 text-rose-900 ring-rose-300",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${map[result]}`}
    >
      {AUDIT_RESULT_LABEL[result]}
    </span>
  );
}

export function AuditTable({ rows, notice, footer, onInspect }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e8eaee] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {notice ? (
        <p className="border-b border-blue-100 bg-blue-50 px-5 py-2.5 text-[12px] text-blue-950">
          {notice}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left">
          <thead>
            <tr className="border-b border-[#eef2f7] bg-slate-50/80 text-[11px] font-semibold tracking-[0.08em] text-[#64748b] uppercase">
              <th className="px-4 py-3 font-semibold">When</th>
              <th className="px-4 py-3 font-semibold">Actor</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Action</th>
              <th className="px-4 py-3 font-semibold">Target</th>
              <th className="px-4 py-3 font-semibold">Result</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-[#f1f5f9] transition-colors last:border-0 hover:bg-slate-50/70"
              >
                <td className="px-4 py-3.5 text-[12px] whitespace-nowrap text-slate-500">
                  {row.atLabel}
                </td>
                <td className="px-4 py-3.5">
                  <p className="text-[13px] font-medium text-[#0f172a]">
                    {row.actorName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {row.actorEmail}
                  </p>
                </td>
                <td className="px-4 py-3.5">
                  <CategoryPill category={row.category} />
                </td>
                <td className="px-4 py-3.5 text-[13px] font-medium text-slate-800">
                  {row.action}
                </td>
                <td className="max-w-[220px] px-4 py-3.5 font-mono text-[11px] text-slate-600">
                  {row.target}
                </td>
                <td className="px-4 py-3.5">
                  <ResultPill result={row.result} />
                </td>
                <td className="px-4 py-3.5">
                  <button
                    type="button"
                    onClick={() => onInspect(row.id)}
                    className="inline-flex h-7 items-center rounded-lg bg-slate-100 px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    Inspect
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer ? (
        <div className="border-t border-[#eef2f7] bg-slate-50/50 px-4 py-3">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
