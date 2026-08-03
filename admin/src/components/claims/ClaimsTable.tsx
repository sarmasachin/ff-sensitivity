import type { ReactNode } from "react";
import {
  CLAIM_RESULT_LABEL,
  type ClaimListRow,
  type ClaimResult,
} from "./claims-data";

type Props = {
  rows: ClaimListRow[];
  notice?: string | null;
  footer?: ReactNode;
  onInspect: (id: string) => void;
  onFlag: (id: string) => void;
  onClear: (id: string) => void;
  onDelete: (id: string) => void;
};

function ResultPill({ result }: { result: ClaimResult }) {
  const map: Record<ClaimResult, string> = {
    SUCCESS: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    ALREADY_CLAIMED: "bg-amber-100 text-amber-900 ring-amber-200",
    COPY_FAILED: "bg-slate-100 text-slate-700 ring-slate-200",
    FLAGGED: "bg-rose-100 text-rose-900 ring-rose-300",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${map[result]}`}
    >
      {CLAIM_RESULT_LABEL[result]}
    </span>
  );
}

function AbuseBar({ score }: { score: number }) {
  const tone =
    score >= 60 ? "bg-rose-500" : score >= 30 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex min-w-[88px] items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${tone}`}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
      <span className="w-6 text-right text-[11px] font-semibold tabular-nums text-slate-600">
        {score}
      </span>
    </div>
  );
}

const btn =
  "inline-flex h-7 items-center rounded-lg px-2.5 text-[11px] font-semibold transition-colors";

export function ClaimsTable({
  rows,
  notice,
  footer,
  onInspect,
  onFlag,
  onClear,
  onDelete,
}: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e8eaee] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {notice ? (
        <p className="border-b border-amber-100 bg-amber-50 px-5 py-2.5 text-[12px] text-amber-900">
          {notice}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left">
          <thead>
            <tr className="border-b border-[#eef2f7] bg-slate-50/80 text-[11px] font-semibold tracking-[0.08em] text-[#64748b] uppercase">
              <th className="px-4 py-3 font-semibold">Reward</th>
              <th className="px-4 py-3 font-semibold">Code</th>
              <th className="px-4 py-3 font-semibold">Trigger</th>
              <th className="px-4 py-3 font-semibold">Device</th>
              <th className="px-4 py-3 font-semibold">Result</th>
              <th className="px-4 py-3 font-semibold">Stock after</th>
              <th className="px-4 py-3 font-semibold">Abuse</th>
              <th className="px-4 py-3 font-semibold">When</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-[#f1f5f9] transition-colors last:border-0 hover:bg-slate-50/70"
              >
                <td className="px-4 py-3.5">
                  <p className="text-[13px] font-medium text-[#0f172a]">
                    {row.title}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                    {row.refId}
                  </p>
                </td>
                <td className="px-4 py-3.5 font-mono text-[12px] text-slate-600">
                  {row.codeMasked}
                </td>
                <td className="px-4 py-3.5">
                  <span className="inline-flex rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800 ring-1 ring-sky-200">
                    Copy tap
                  </span>
                </td>
                <td className="px-4 py-3.5 font-mono text-[12px] text-slate-600">
                  {row.deviceId}
                </td>
                <td className="px-4 py-3.5">
                  <ResultPill result={row.result} />
                </td>
                <td className="px-4 py-3.5 text-[13px] tabular-nums text-slate-700">
                  {row.stockAfter}
                </td>
                <td className="px-4 py-3.5">
                  <AbuseBar score={row.abuseScore} />
                </td>
                <td className="px-4 py-3.5 text-[12px] whitespace-nowrap text-slate-500">
                  {row.whenLabel}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onInspect(row.id)}
                      className={`${btn} bg-slate-100 text-slate-700 hover:bg-slate-200`}
                    >
                      Inspect
                    </button>
                    {row.result === "FLAGGED" || row.abuseScore >= 60 ? (
                      <button
                        type="button"
                        onClick={() => onClear(row.id)}
                        className={`${btn} bg-emerald-600 text-white hover:bg-emerald-500`}
                      >
                        Clear
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onFlag(row.id)}
                        className={`${btn} bg-white text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50`}
                      >
                        Flag
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDelete(row.id)}
                      className={`${btn} bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:ring-rose-200`}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer ? (
        <div className="border-t border-[#eef2f7] px-4 py-3">{footer}</div>
      ) : null}
    </div>
  );
}
