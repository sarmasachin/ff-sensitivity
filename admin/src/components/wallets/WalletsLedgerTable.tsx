import type { ReactNode } from "react";
import {
  LEDGER_KIND_LABEL,
  signedCoins,
  type LedgerEntry,
  type LedgerKind,
} from "./wallets-data";

type Props = {
  rows: LedgerEntry[];
  notice?: string | null;
  footer?: ReactNode;
};

function KindPill({ kind }: { kind: LedgerKind }) {
  const map: Record<LedgerKind, string> = {
    EARN: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    SPEND: "bg-slate-100 text-slate-700 ring-slate-200",
    GRANT: "bg-teal-100 text-teal-900 ring-teal-200",
    REVOKE: "bg-amber-100 text-amber-900 ring-amber-200",
    PURCHASE: "bg-sky-100 text-sky-900 ring-sky-200",
    ADJUST: "bg-violet-100 text-violet-900 ring-violet-200",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${map[kind]}`}
    >
      {LEDGER_KIND_LABEL[kind]}
    </span>
  );
}

export function WalletsLedgerTable({ rows, notice, footer }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e8eaee] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {notice ? (
        <p className="border-b border-teal-100 bg-teal-50 px-5 py-2.5 text-[12px] text-teal-950">
          {notice}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left">
          <thead>
            <tr className="border-b border-[#eef2f7] bg-slate-50/80 text-[11px] font-semibold tracking-[0.08em] text-[#64748b] uppercase">
              <th className="px-4 py-3 font-semibold">When</th>
              <th className="px-4 py-3 font-semibold">Device</th>
              <th className="px-4 py-3 font-semibold">Kind</th>
              <th className="px-4 py-3 font-semibold">Amount</th>
              <th className="px-4 py-3 font-semibold">After</th>
              <th className="px-4 py-3 font-semibold">Reason</th>
              <th className="px-4 py-3 font-semibold">Actor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-[#f1f5f9] transition-colors last:border-0 hover:bg-slate-50/70"
              >
                <td className="px-4 py-3.5 text-[12px] whitespace-nowrap text-slate-500">
                  {row.whenLabel}
                </td>
                <td className="px-4 py-3.5">
                  <p className="text-[13px] font-medium text-slate-900">
                    {row.label}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                    {row.deviceId}
                  </p>
                </td>
                <td className="px-4 py-3.5">
                  <KindPill kind={row.kind} />
                </td>
                <td
                  className={[
                    "px-4 py-3.5 text-[13px] font-semibold tabular-nums",
                    row.amount > 0
                      ? "text-emerald-700"
                      : row.amount < 0
                        ? "text-rose-700"
                        : "text-slate-600",
                  ].join(" ")}
                >
                  {signedCoins(row.amount)}
                </td>
                <td className="px-4 py-3.5 text-[13px] tabular-nums text-slate-700">
                  {row.balanceAfter.toLocaleString()}
                </td>
                <td className="max-w-[280px] px-4 py-3.5 text-[12px] text-slate-600">
                  {row.reason}
                </td>
                <td className="px-4 py-3.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                  {row.actor}
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
