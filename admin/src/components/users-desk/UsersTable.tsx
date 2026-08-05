import type { ReactNode } from "react";
import {
  USER_STATUS_LABEL,
  type UserAccountStatus,
  type UserListRow,
} from "./users-data";

type Props = {
  rows: UserListRow[];
  notice?: string | null;
  footer?: ReactNode;
  onInspect: (id: string) => void;
  onRestrict: (id: string) => void;
  onSuspend: (id: string) => void;
  onRestore: (id: string) => void;
};

function StatusPill({ status }: { status: UserAccountStatus }) {
  const map: Record<UserAccountStatus, string> = {
    ACTIVE: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    RESTRICTED: "bg-amber-100 text-amber-900 ring-amber-200",
    SUSPENDED: "bg-rose-100 text-rose-900 ring-rose-300",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${map[status]}`}
    >
      {USER_STATUS_LABEL[status]}
    </span>
  );
}

const btn =
  "inline-flex h-7 items-center rounded-lg px-2.5 text-[11px] font-semibold transition-colors";

export function UsersTable({
  rows,
  notice,
  footer,
  onInspect,
  onRestrict,
  onSuspend,
  onRestore,
}: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e8eaee] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {notice ? (
        <p className="border-b border-cyan-100 bg-cyan-50 px-5 py-2.5 text-[12px] text-cyan-950">
          {notice}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] text-left">
          <thead>
            <tr className="border-b border-[#eef2f7] bg-slate-50/80 text-[11px] font-semibold tracking-[0.08em] text-[#64748b] uppercase">
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Device</th>
              <th className="px-4 py-3 font-semibold">Coins</th>
              <th className="px-4 py-3 font-semibold">Activity</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Last active</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const initial = row.displayName.trim().charAt(0).toUpperCase();
              return (
                <tr
                  key={row.id}
                  className="border-b border-[#f1f5f9] transition-colors last:border-0 hover:bg-slate-50/70"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-[12px] font-semibold text-white"
                        aria-hidden
                      >
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-[#0f172a]">
                          {row.displayName}
                        </p>
                        <p className="mt-0.5 truncate text-[12px] text-slate-500">
                          {row.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-[13px] text-slate-800">{row.deviceLabel}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                      {row.deviceId}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-[15px] font-semibold tabular-nums text-slate-900">
                    {row.coinBalance.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-[12px] text-slate-600">
                    {row.claimsCount} claims · {row.redeemUnlocks} unlocks
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusPill status={row.status} />
                  </td>
                  <td className="px-4 py-3.5 text-[12px] text-slate-600">
                    {row.lastActiveLabel}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        className={`${btn} bg-slate-900 text-white hover:bg-slate-800`}
                        onClick={() => onInspect(row.id)}
                      >
                        Profile
                      </button>
                      {row.status === "ACTIVE" ? (
                        <button
                          type="button"
                          className={`${btn} bg-amber-50 text-amber-900 hover:bg-amber-100`}
                          onClick={() => onRestrict(row.id)}
                        >
                          Restrict
                        </button>
                      ) : null}
                      {row.status === "ACTIVE" || row.status === "RESTRICTED" ? (
                        <button
                          type="button"
                          className={`${btn} bg-rose-50 text-rose-900 hover:bg-rose-100`}
                          onClick={() => onSuspend(row.id)}
                        >
                          Suspend
                        </button>
                      ) : null}
                      {row.status === "RESTRICTED" ||
                      row.status === "SUSPENDED" ? (
                        <button
                          type="button"
                          className={`${btn} bg-emerald-50 text-emerald-900 hover:bg-emerald-100`}
                          onClick={() => onRestore(row.id)}
                        >
                          Restore
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {footer ? (
        <div className="border-t border-[#eef2f7] px-4 py-3">{footer}</div>
      ) : null}
    </div>
  );
}
