import type { ReactNode } from "react";
import type { QuizQuestionRow } from "./challenge-data";

type Props = {
  rows: QuizQuestionRow[];
  notice?: string | null;
  footer?: ReactNode;
  onEdit: (id: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
};

const btn =
  "inline-flex h-7 items-center rounded-lg px-2.5 text-[11px] font-semibold transition-colors";

export function ChallengeQuizTable({
  rows,
  notice,
  footer,
  onEdit,
  onToggle,
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
        <table className="w-full min-w-[920px] text-left">
          <thead>
            <tr className="border-b border-[#eef2f7] bg-slate-50/80 text-[11px] font-semibold tracking-[0.08em] text-[#64748b] uppercase">
              <th className="px-4 py-3 font-semibold">Question</th>
              <th className="px-4 py-3 font-semibold">Correct</th>
              <th className="px-4 py-3 font-semibold">Options</th>
              <th className="px-4 py-3 font-semibold">Status</th>
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
                  <p className="max-w-[320px] text-[13px] font-medium text-[#0f172a]">
                    {row.question}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                    {row.id}
                  </p>
                </td>
                <td className="px-4 py-3.5">
                  <span className="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200">
                    {row.options[row.correctIndex]}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-[11px] text-slate-500">
                  {row.options.join(" · ")}
                </td>
                <td className="px-4 py-3.5">
                  <button
                    type="button"
                    onClick={() => onToggle(row.id)}
                    className={[
                      "inline-flex h-7 items-center rounded-full px-2.5 text-[11px] font-semibold ring-1",
                      row.enabled
                        ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                        : "bg-slate-100 text-slate-600 ring-slate-200",
                    ].join(" ")}
                  >
                    {row.enabled ? "Live" : "Off"}
                  </button>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEdit(row.id)}
                      className={`${btn} bg-slate-100 text-slate-700 hover:bg-slate-200`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(row.id)}
                      className={`${btn} bg-white text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50`}
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
