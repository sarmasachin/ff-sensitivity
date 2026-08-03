import {
  DEVICE_STATUS_LABEL,
  type DeviceListRow,
} from "./devices-data";

type Props = {
  open: boolean;
  row: DeviceListRow | null;
  onClose: () => void;
  onBlock: (id: string) => void;
  onUnblock: (id: string) => void;
  onInvalidateToken: (id: string) => void;
};

export function DevicesDetailDrawer({
  open,
  row,
  onClose,
  onBlock,
  onUnblock,
  onInvalidateToken,
}: Props) {
  if (!open || !row) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]"
        aria-label="Close drawer"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-[400px] flex-col border-l border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-indigo-700 uppercase">
              Device detail
            </p>
            <h2 className="mt-1 truncate text-[18px] font-bold tracking-[-0.02em] text-slate-900">
              {row.label}
            </h2>
            <p className="mt-0.5 font-mono text-[12px] text-slate-500">
              {row.deviceId}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 px-3.5 py-3 text-[12px] font-medium text-indigo-950">
            Status:{" "}
            <span className="font-bold">{DEVICE_STATUS_LABEL[row.status]}</span>
            {" · "}
            Last seen {row.lastSeenLabel}
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Brand
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-900">{row.brand}</dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Model
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-900">{row.model}</dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Android
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-900">
                {row.androidVersion}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                App
              </dt>
              <dd className="mt-0.5 font-mono text-[12px] font-semibold text-slate-900">
                v{row.appVersion} ({row.appVersionCode})
              </dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Coins
              </dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-slate-900">
                {row.coinBalance.toLocaleString()}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Push
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-900">
                {row.pushEnabled ? "Enabled" : "Disabled"}
              </dd>
            </div>
            <div className="col-span-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                FCM token
              </dt>
              <dd className="mt-0.5 font-mono text-[12px] font-semibold text-slate-900">
                {row.hasFcmToken ? row.fcmTokenMasked : "Not registered"}
              </dd>
            </div>
          </dl>

          <p className="mt-5 mb-2 text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
            Ops note
          </p>
          <p className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-3.5 py-3 text-[13px] leading-relaxed text-slate-700">
            {row.note}
          </p>
        </div>

        <footer className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-4">
          {row.status === "BLOCKED" ? (
            <button
              type="button"
              onClick={() => onUnblock(row.id)}
              className="h-10 flex-1 rounded-xl bg-emerald-600 px-3 text-[13px] font-semibold text-white hover:bg-emerald-500"
            >
              Unblock device
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onBlock(row.id)}
              className="h-10 flex-1 rounded-xl bg-rose-600 px-3 text-[13px] font-semibold text-white hover:bg-rose-500"
            >
              Block device
            </button>
          )}
          {row.hasFcmToken ? (
            <button
              type="button"
              onClick={() => onInvalidateToken(row.id)}
              className="h-10 rounded-xl bg-amber-50 px-3 text-[13px] font-semibold text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100"
            >
              Drop token
            </button>
          ) : null}
        </footer>
      </aside>
    </div>
  );
}
