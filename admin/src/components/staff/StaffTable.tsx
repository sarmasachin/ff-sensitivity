import type { ReactNode } from "react";
import {
  STAFF_ROLE_LABEL,
  STAFF_STATUS_LABEL,
  type StaffListRow,
  type StaffRole,
  type StaffStatus,
} from "./staff-data";

type Props = {
  rows: StaffListRow[];
  notice?: string | null;
  footer?: ReactNode;
  onInspect: (id: string) => void;
  onDisable: (id: string) => void;
  onEnable: (id: string) => void;
  onResend: (id: string) => void;
};

function RolePill({ role }: { role: StaffRole }) {
  const map: Record<StaffRole, string> = {
    SUPER_ADMIN: "bg-rose-100 text-rose-900 ring-rose-200",
    ADMIN: "bg-sky-100 text-sky-900 ring-sky-200",
    SUB_ADMIN: "bg-amber-100 text-amber-900 ring-amber-200",
    VIEWER: "bg-slate-100 text-slate-700 ring-slate-200",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${map[role]}`}
    >
      {STAFF_ROLE_LABEL[role]}
    </span>
  );
}

function StatusPill({ status }: { status: StaffStatus }) {
  const map: Record<StaffStatus, string> = {
    ACTIVE: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    DISABLED: "bg-rose-100 text-rose-900 ring-rose-300",
    INVITED: "bg-amber-100 text-amber-900 ring-amber-200",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${map[status]}`}
    >
      {STAFF_STATUS_LABEL[status]}
    </span>
  );
}

const btn =
  "inline-flex h-7 items-center rounded-lg px-2.5 text-[11px] font-semibold transition-colors";

export function StaffTable({
  rows,
  notice,
  footer,
  onInspect,
  onDisable,
  onEnable,
  onResend,
}: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e8eaee] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {notice ? (
        <p className="border-b border-zinc-200 bg-zinc-50 px-5 py-2.5 text-[12px] text-zinc-900">
          {notice}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] text-left">
          <thead>
            <tr className="border-b border-[#eef2f7] bg-slate-50/80 text-[11px] font-semibold tracking-[0.08em] text-[#64748b] uppercase">
              <th className="px-4 py-3 font-semibold">Person</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Modules</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Last login</th>
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
                    {row.name}
                  </p>
                  <p className="mt-0.5 text-[12px] text-slate-500">{row.email}</p>
                </td>
                <td className="px-4 py-3.5">
                  <RolePill role={row.role} />
                </td>
                <td className="px-4 py-3.5 text-[13px] tabular-nums text-slate-700">
                  {row.modules.length}
                  <span className="ml-1 text-[11px] text-slate-400">mods</span>
                </td>
                <td className="px-4 py-3.5">
                  <StatusPill status={row.status} />
                </td>
                <td className="px-4 py-3.5 text-[12px] whitespace-nowrap text-slate-500">
                  {row.lastLoginLabel}
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
                    {row.status === "INVITED" ? (
                      <button
                        type="button"
                        onClick={() => onResend(row.id)}
                        className={`${btn} bg-amber-50 text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100`}
                      >
                        Resend
                      </button>
                    ) : null}
                    {row.role !== "SUPER_ADMIN" ? (
                      row.status === "DISABLED" ? (
                        <button
                          type="button"
                          onClick={() => onEnable(row.id)}
                          className={`${btn} bg-emerald-600 text-white hover:bg-emerald-500`}
                        >
                          Enable
                        </button>
                      ) : row.status === "ACTIVE" ? (
                        <button
                          type="button"
                          onClick={() => onDisable(row.id)}
                          className={`${btn} bg-rose-50 text-rose-800 ring-1 ring-rose-200 hover:bg-rose-100`}
                        >
                          Disable
                        </button>
                      ) : null
                    ) : null}
                  </div>
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
