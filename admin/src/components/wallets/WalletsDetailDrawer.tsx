import {
  LEDGER_KIND_LABEL,
  WALLET_STATUS_LABEL,
  signedCoins,
  type LedgerEntry,
  type WalletListRow,
} from "./wallets-data";

type Props = {
  open: boolean;
  row: WalletListRow | null;
  ledger: LedgerEntry[];
  onClose: () => void;
  onFreeze: (id: string) => void;
  onUnfreeze: (id: string) => void;
  onAdjust: (id: string) => void;
};

export function WalletsDetailDrawer({
  open,
  row,
  ledger,
  onClose,
  onFreeze,
  onUnfreeze,
  onAdjust,
}: Props) {
  if (!open || !row) return null;

  const lines = ledger.filter((l) => l.walletId === row.id).slice(0, 6);

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]"
        aria-label="Close drawer"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-[420px] flex-col border-l border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-teal-700 uppercase">
              Wallet detail
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
          <div className="rounded-xl border border-teal-200 bg-teal-50/70 px-3.5 py-3">
            <p className="text-[11px] font-semibold tracking-wide text-teal-800 uppercase">
              Balance
            </p>
            <p className="mt-1 text-[28px] font-bold tracking-[-0.03em] tabular-nums text-teal-950">
              {row.balance.toLocaleString()}
              <span className="ml-1.5 text-[13px] font-semibold text-teal-700/80">
                coins
              </span>
            </p>
            <p className="mt-1 text-[12px] text-teal-900/80">
              {WALLET_STATUS_LABEL[row.status]} · last txn {row.lastTxnLabel}
            </p>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Lifetime earned
              </dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-emerald-700">
                +{row.lifetimeEarned.toLocaleString()}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Lifetime spent
              </dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-rose-700">
                −{row.lifetimeSpent.toLocaleString()}
              </dd>
            </div>
          </dl>

          <p className="mt-5 mb-2 text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
            Ops note
          </p>
          <p className="rounded-xl border border-teal-100 bg-teal-50/50 px-3.5 py-3 text-[13px] leading-relaxed text-slate-700">
            {row.note}
          </p>

          <p className="mt-5 mb-2 text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
            Recent ledger
          </p>
          {lines.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-3.5 py-4 text-[12px] text-slate-500">
              No ledger lines for this wallet in the demo set.
            </p>
          ) : (
            <ul className="space-y-2">
              {lines.map((line) => (
                <li
                  key={line.id}
                  className="rounded-xl border border-slate-100 px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-500">
                      {LEDGER_KIND_LABEL[line.kind]} · {line.whenLabel}
                    </span>
                    <span
                      className={[
                        "text-[12px] font-semibold tabular-nums",
                        line.amount > 0
                          ? "text-emerald-700"
                          : line.amount < 0
                            ? "text-rose-700"
                            : "text-slate-600",
                      ].join(" ")}
                    >
                      {signedCoins(line.amount)}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-slate-600">{line.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={() => onAdjust(row.id)}
            className="h-10 flex-1 rounded-xl bg-teal-600 px-3 text-[13px] font-semibold text-white hover:bg-teal-500"
          >
            Grant / revoke
          </button>
          {row.status === "FROZEN" ? (
            <button
              type="button"
              onClick={() => onUnfreeze(row.id)}
              className="h-10 rounded-xl bg-emerald-600 px-3 text-[13px] font-semibold text-white hover:bg-emerald-500"
            >
              Unfreeze
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onFreeze(row.id)}
              className="h-10 rounded-xl bg-rose-50 px-3 text-[13px] font-semibold text-rose-800 ring-1 ring-rose-200 hover:bg-rose-100"
            >
              Freeze
            </button>
          )}
        </footer>
      </aside>
    </div>
  );
}
