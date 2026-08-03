"use client";

import { useEffect, useState } from "react";
import type { WalletListRow } from "./wallets-data";

export type WalletAdjustPayload = {
  walletId: string;
  mode: "grant" | "revoke";
  amount: number;
  reason: string;
};

type Props = {
  open: boolean;
  wallets: WalletListRow[];
  presetWalletId?: string | null;
  onClose: () => void;
  onSubmit: (payload: WalletAdjustPayload) => void;
};

const fieldClass =
  "mt-1 h-10 w-full rounded-lg border border-slate-200/90 bg-white px-3 text-[13px] text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10";
const labelClass = "block text-[11px] font-semibold text-slate-600";

export function WalletsGrantModal({
  open,
  wallets,
  presetWalletId,
  onClose,
  onSubmit,
}: Props) {
  const [walletId, setWalletId] = useState("");
  const [mode, setMode] = useState<"grant" | "revoke">("grant");
  const [amount, setAmount] = useState("100");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const fallback = wallets[0]?.id ?? "";
    setWalletId(presetWalletId || fallback);
    setMode("grant");
    setAmount("100");
    setReason("");
    setError(null);
  }, [open, presetWalletId, wallets]);

  if (!open) return null;

  const selected = wallets.find((w) => w.id === walletId) ?? null;

  function submit() {
    if (!walletId) {
      setError("Select a wallet.");
      return;
    }
    const n = Number(amount.trim());
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
      setError("Amount must be a whole number ≥ 1.");
      return;
    }
    if (!reason.trim()) {
      setError("Reason is required for audit.");
      return;
    }
    if (selected?.status === "FROZEN" && mode === "grant") {
      setError("Unfreeze the wallet before granting coins.");
      return;
    }
    if (mode === "revoke" && selected && n > selected.balance) {
      setError(
        `Cannot revoke ${n} — balance is only ${selected.balance.toLocaleString()}.`,
      );
      return;
    }
    onSubmit({
      walletId,
      mode,
      amount: n,
      reason: reason.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]"
        aria-label="Close modal"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.12em] text-teal-700 uppercase">
              Staff adjust
            </p>
            <h2 className="mt-1 text-[18px] font-bold tracking-[-0.02em] text-slate-900">
              Grant / revoke coins
            </h2>
            <p className="mt-1 text-[12px] text-slate-500">
              Writes an audited ledger line. Frozen wallets cannot receive
              grants.
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
        </div>

        <div className="mt-4 space-y-3">
          <label className={labelClass}>
            Wallet
            <select
              className={fieldClass}
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label} · {w.balance.toLocaleString()} coins
                  {w.status === "FROZEN" ? " (frozen)" : ""}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-1.5 rounded-xl bg-slate-100 p-1">
            {(["grant", "revoke"] as const).map((m) => {
              const on = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={[
                    "h-9 flex-1 rounded-lg text-[12px] font-semibold capitalize",
                    on
                      ? m === "grant"
                        ? "bg-teal-600 text-white"
                        : "bg-amber-600 text-white"
                      : "text-slate-600 hover:bg-white/70",
                  ].join(" ")}
                >
                  {m}
                </button>
              );
            })}
          </div>

          <label className={labelClass}>
            Amount
            <input
              type="number"
              min={1}
              className={fieldClass}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>

          <label className={labelClass}>
            Reason (audit)
            <textarea
              rows={3}
              className="mt-1 w-full resize-none rounded-lg border border-slate-200/90 bg-white px-3 py-2.5 text-[13px] text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Support ticket #… / goodwill / duplicate payout…"
            />
          </label>

          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-900"
            >
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl bg-slate-100 px-3.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="h-10 rounded-xl bg-slate-900 px-3.5 text-[13px] font-semibold text-white hover:bg-slate-800"
          >
            Apply {mode}
          </button>
        </div>
      </div>
    </div>
  );
}
