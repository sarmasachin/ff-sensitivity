import type { ReactNode } from "react";
import {
  WALLET_STATUS_LABEL,
  type WalletListRow,
  type WalletStatus,
} from "./wallets-data";

type Props = {
  rows: WalletListRow[];
  notice?: string | null;
  footer?: ReactNode;
  onInspect: (id: string) => void;
  onFreeze: (id: string) => void;
  onUnfreeze: (id: string) => void;
  onAdjust: (id: string) => void;
};

function StatusPill({ status }: { status: WalletStatus }) {
  const map: Record<WalletStatus, string> = {
    ACTIVE: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    FROZEN: "bg-rose-100 text-rose-900 ring-rose-300",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${map[status]}`}
    >
      {WALLET_STATUS_LABEL[status]}
    </span>
  );
}

const btn =
  "inline-flex h-7 items-center rounded-lg px-2.5 text-[11px] font-semibold transition-colors";

export function WalletsTable({
  rows,
  notice,
  footer,
  onInspect,
  onFreeze,
  onUnfreeze,
  onAdjust,
}: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e8eaee] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {notice ? (
        <p className="border-b border-teal-100 bg-teal-50 px-5 py-2.5 text-[12px] text-teal-950">
          {notice}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] text-left">
          <thead>
            <tr className="border-b border-[#eef2f7] bg-slate-50/80 text-[11px] font-semibold tracking-[0.08em] text-[#64748b] uppercase">
              <th className="px-4 py-3 font-semibold">Wallet</th>
              <th className="px-4 py-3 font-semibold">Balance</th>
              <th className="px-4 py-3 font-semibold">Lifetime</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Last txn</th>
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
                    {row.label}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                    {row.deviceId}
                  </p>
                </td>
                <td className="px-4 py-3.5 text-[15px] font-semibold tabular-nums text-slate-900">
                  {row.balance.toLocaleString()}
                </td>
                <td className="px-4 py-3.5 text-[12px] text-slate-600">
                  <span className="tabular-nums text-emerald-700">
                    +{row.lifetimeEarned.toLocaleString()}
                  </span>
                  <span className="mx-1 text-slate-300">/</span>
                  <span className="tabular-nums text-rose-700">
                    −{row.lifetimeSpent.toLocaleString()}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <StatusPill status={row.status} />
                </td>
                <td className="px-4 py-3.5 text-[12px] whitespace-nowrap text-slate-500">
                  {row.lastTxnLabel}
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
                    <button
                      type="button"
                      onClick={() => onAdjust(row.id)}
                      className={`${btn} bg-teal-600 text-white hover:bg-teal-500`}
                    >
                      Adjust
                    </button>
                    {row.status === "FROZEN" ? (
                      <button
                        type="button"
                        onClick={() => onUnfreeze(row.id)}
                        className={`${btn} bg-emerald-600 text-white hover:bg-emerald-500`}
                      >
                        Unfreeze
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onFreeze(row.id)}
                        className={`${btn} bg-rose-50 text-rose-800 ring-1 ring-rose-200 hover:bg-rose-100`}
                      >
                        Freeze
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
        <div className="border-t border-[#eef2f7] bg-slate-50/50 px-4 py-3">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
