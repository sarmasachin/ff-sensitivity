import type { ReactNode } from "react";
import {
  DEVICE_STATUS_LABEL,
  type DeviceListRow,
  type DeviceStatus,
} from "./devices-data";

type Props = {
  rows: DeviceListRow[];
  notice?: string | null;
  footer?: ReactNode;
  onInspect: (id: string) => void;
  onBlock: (id: string) => void;
  onUnblock: (id: string) => void;
  onInvalidateToken: (id: string) => void;
};

function StatusPill({ status }: { status: DeviceStatus }) {
  const map: Record<DeviceStatus, string> = {
    ACTIVE: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    STALE: "bg-amber-100 text-amber-900 ring-amber-200",
    BLOCKED: "bg-rose-100 text-rose-900 ring-rose-300",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${map[status]}`}
    >
      {DEVICE_STATUS_LABEL[status]}
    </span>
  );
}

const btn =
  "inline-flex h-7 items-center rounded-lg px-2.5 text-[11px] font-semibold transition-colors";

export function DevicesTable({
  rows,
  notice,
  footer,
  onInspect,
  onBlock,
  onUnblock,
  onInvalidateToken,
}: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e8eaee] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {notice ? (
        <p className="border-b border-indigo-100 bg-indigo-50 px-5 py-2.5 text-[12px] text-indigo-950">
          {notice}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] text-left">
          <thead>
            <tr className="border-b border-[#eef2f7] bg-slate-50/80 text-[11px] font-semibold tracking-[0.08em] text-[#64748b] uppercase">
              <th className="px-4 py-3 font-semibold">Device</th>
              <th className="px-4 py-3 font-semibold">App</th>
              <th className="px-4 py-3 font-semibold">FCM</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Coins</th>
              <th className="px-4 py-3 font-semibold">Last seen</th>
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
                <td className="px-4 py-3.5">
                  <p className="font-mono text-[12px] font-semibold text-slate-800">
                    v{row.appVersion}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    code {row.appVersionCode}
                  </p>
                </td>
                <td className="px-4 py-3.5">
                  {row.hasFcmToken ? (
                    <div>
                      <span className="inline-flex rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-800 ring-1 ring-indigo-200">
                        Token
                      </span>
                      <p className="mt-1 font-mono text-[10px] text-slate-400">
                        {row.fcmTokenMasked}
                      </p>
                    </div>
                  ) : (
                    <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                      None
                    </span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <StatusPill status={row.status} />
                </td>
                <td className="px-4 py-3.5 text-[13px] tabular-nums text-slate-700">
                  {row.coinBalance.toLocaleString()}
                </td>
                <td className="px-4 py-3.5 text-[12px] whitespace-nowrap text-slate-500">
                  {row.lastSeenLabel}
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
                    {row.status === "BLOCKED" ? (
                      <button
                        type="button"
                        onClick={() => onUnblock(row.id)}
                        className={`${btn} bg-emerald-600 text-white hover:bg-emerald-500`}
                      >
                        Unblock
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onBlock(row.id)}
                        className={`${btn} bg-rose-600 text-white hover:bg-rose-500`}
                      >
                        Block
                      </button>
                    )}
                    {row.hasFcmToken ? (
                      <button
                        type="button"
                        onClick={() => onInvalidateToken(row.id)}
                        className={`${btn} bg-amber-50 text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100`}
                      >
                        Drop token
                      </button>
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
