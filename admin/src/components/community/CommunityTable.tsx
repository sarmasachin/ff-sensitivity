import type { ReactNode } from "react";
import {
  COMMUNITY_STATUS_LABEL,
  kdOf,
  type CommunityListRow,
  type CommunityStatus,
} from "./community-data";

type Props = {
  rows: CommunityListRow[];
  notice?: string | null;
  footer?: ReactNode;
  onInspect: (id: string) => void;
  onApprove: (id: string) => void;
  onFeature: (id: string) => void;
  onHide: (id: string) => void;
  onUnhide: (id: string) => void;
};

function StatusPill({ status }: { status: CommunityStatus }) {
  const map: Record<CommunityStatus, string> = {
    PENDING: "bg-amber-100 text-amber-900 ring-amber-200",
    APPROVED: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    FEATURED: "bg-indigo-100 text-indigo-800 ring-indigo-200",
    HIDDEN: "bg-slate-100 text-slate-600 ring-slate-200",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${map[status]}`}
    >
      {COMMUNITY_STATUS_LABEL[status]}
    </span>
  );
}

const btn =
  "inline-flex h-7 items-center rounded-lg px-2.5 text-[11px] font-semibold transition-colors";

export function CommunityTable({
  rows,
  notice,
  footer,
  onInspect,
  onApprove,
  onFeature,
  onHide,
  onUnhide,
}: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e8eaee] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {notice ? (
        <p className="border-b border-amber-100 bg-amber-50 px-5 py-2.5 text-[12px] text-amber-900">
          {notice}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left">
          <thead>
            <tr className="border-b border-[#eef2f7] bg-slate-50/80 text-[11px] font-semibold tracking-[0.08em] text-[#64748b] uppercase">
              <th className="px-4 py-3 font-semibold">Player</th>
              <th className="px-4 py-3 font-semibold">Rank / role</th>
              <th className="px-4 py-3 font-semibold">Device</th>
              <th className="px-4 py-3 font-semibold">KD</th>
              <th className="px-4 py-3 font-semibold">Reports</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Submitted</th>
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
                  <p className="text-[13px] font-semibold text-[#0f172a]">
                    {row.name}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                    ID {row.freeFireId}
                  </p>
                </td>
                <td className="px-4 py-3.5">
                  <p className="text-[13px] font-medium text-slate-800">
                    {row.rank}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{row.role}</p>
                </td>
                <td className="px-4 py-3.5">
                  <p className="max-w-[180px] truncate text-[12px] font-medium text-slate-800">
                    {row.deviceLabel}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {row.deviceMeta}
                  </p>
                </td>
                <td className="px-4 py-3.5 text-[13px] font-semibold tabular-nums text-slate-900">
                  {kdOf(row)}
                </td>
                <td className="px-4 py-3.5">
                  {row.reports > 0 ? (
                    <span className="inline-flex rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200">
                      {row.reports}
                    </span>
                  ) : (
                    <span className="text-[12px] text-slate-400">0</span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <StatusPill status={row.status} />
                </td>
                <td className="px-4 py-3.5 text-[12px] whitespace-nowrap text-slate-500">
                  {row.submittedLabel}
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
                    {row.status === "PENDING" || row.status === "HIDDEN" ? (
                      <button
                        type="button"
                        onClick={() => onApprove(row.id)}
                        className={`${btn} bg-emerald-600 text-white hover:bg-emerald-500`}
                      >
                        Approve
                      </button>
                    ) : null}
                    {row.status === "APPROVED" || row.status === "PENDING" ? (
                      <button
                        type="button"
                        onClick={() => onFeature(row.id)}
                        className={`${btn} bg-indigo-600 text-white hover:bg-indigo-500`}
                      >
                        Feature
                      </button>
                    ) : null}
                    {row.status === "FEATURED" ? (
                      <button
                        type="button"
                        onClick={() => onApprove(row.id)}
                        className={`${btn} bg-white text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50`}
                      >
                        Unfeature
                      </button>
                    ) : null}
                    {row.status !== "HIDDEN" ? (
                      <button
                        type="button"
                        onClick={() => onHide(row.id)}
                        className={`${btn} bg-white text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50`}
                      >
                        Hide
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onUnhide(row.id)}
                        className={`${btn} bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50`}
                      >
                        Restore
                      </button>
                    )}
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
