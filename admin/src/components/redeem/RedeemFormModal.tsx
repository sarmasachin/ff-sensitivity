"use client";

import { FormEvent, useEffect, useState } from "react";
import type {
  RedeemCadence,
  RedeemFormValues,
  RedeemStatus,
  RedeemType,
} from "./redeem-data";

type Props = {
  open: boolean;
  mode: "add" | "edit";
  initial: RedeemFormValues;
  onClose: () => void;
  onSubmit: (values: RedeemFormValues) => string | null;
};

const fieldClass =
  "mt-1 h-9 w-full rounded-lg border border-slate-200/90 bg-slate-50 px-3 text-[13px] text-slate-900 outline-none transition-[border-color,box-shadow,background-color] placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10";

const labelClass = "block text-[11px] font-semibold text-slate-600";

export function RedeemFormModal({
  open,
  mode,
  initial,
  onClose,
  onSubmit,
}: Props) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValues(initial);
      setError(null);
    }
  }, [open, initial]);

  if (!open) return null;

  function patch<K extends keyof RedeemFormValues>(
    key: K,
    value: RedeemFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const err = onSubmit(values);
    if (err) {
      setError(err);
      return;
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
        aria-label="Close dialog"
        onClick={onClose}
      />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 flex w-full max-w-[640px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_25px_50px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/80"
      >
        <header className="relative shrink-0 overflow-hidden border-b border-indigo-500/20 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 px-5 py-3.5 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-8 -right-6 h-28 w-28 rounded-full bg-white/15 blur-2xl"
          />
          <p className="text-[10px] font-semibold tracking-[0.16em] text-white/75 uppercase">
            Inventory
          </p>
          <h2 className="mt-0.5 text-[18px] font-bold tracking-[-0.03em]">
            {mode === "add" ? "Add redeem code" : "Edit redeem code"}
          </h2>
          <p className="mt-0.5 text-[11px] text-white/80">
            Local draft until Redeem API is connected.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25"
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

        <div className="px-5 py-3.5">
          {error ? (
            <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-700">
              {error}
            </p>
          ) : null}

          <p className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
            Basics
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <label className={`${labelClass} sm:col-span-2`}>
              Title
              <input
                className={fieldClass}
                value={values.title}
                onChange={(e) => patch("title", e.target.value)}
                placeholder="Google Play Gift Card"
                required
              />
            </label>
            <label className={labelClass}>
              Value
              <input
                className={fieldClass}
                value={values.valueLabel}
                onChange={(e) => patch("valueLabel", e.target.value)}
                placeholder="₹50 INR"
                required
              />
            </label>
            <label className={labelClass}>
              Full code
              <input
                className={`${fieldClass} font-mono tracking-wide`}
                value={values.codeSecret}
                onChange={(e) => patch("codeSecret", e.target.value)}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                required
              />
            </label>
          </div>

          <p className="mt-3.5 mb-2 text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
            Inventory
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <label className={labelClass}>
              Type
              <select
                className={fieldClass}
                value={values.type}
                onChange={(e) => patch("type", e.target.value as RedeemType)}
              >
                <option value="GOOGLE_PLAY">Play Gift</option>
                <option value="FF_DIAMONDS">FF Diamonds</option>
              </select>
            </label>
            <label className={labelClass}>
              Cadence
              <select
                className={fieldClass}
                value={values.cadence}
                onChange={(e) =>
                  patch("cadence", e.target.value as RedeemCadence)
                }
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
              </select>
            </label>
            <label className={labelClass}>
              Status
              <select
                className={fieldClass}
                value={values.status}
                onChange={(e) =>
                  patch("status", e.target.value as RedeemStatus)
                }
              >
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="EXHAUSTED">Exhausted</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </label>
            <label className={labelClass}>
              Stock
              <input
                type="number"
                min={0}
                className={fieldClass}
                value={values.stockLeft}
                onChange={(e) => patch("stockLeft", Number(e.target.value))}
              />
            </label>
            <label className={labelClass}>
              Coin cost
              <input
                className={fieldClass}
                value={values.coinCost}
                onChange={(e) => patch("coinCost", e.target.value)}
                placeholder="Leave blank if free"
              />
            </label>
            <label className={labelClass}>
              Expires label
              <input
                className={fieldClass}
                value={values.expiresLabel}
                onChange={(e) => patch("expiresLabel", e.target.value)}
                placeholder="In 4 hours"
              />
            </label>
          </div>

          <p className="mt-3.5 mb-2 text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
            Delivery
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <label className={labelClass}>
              Redeem URL
              <input
                className={fieldClass}
                value={values.redeemUrl}
                onChange={(e) => patch("redeemUrl", e.target.value)}
              />
            </label>
            <label className={labelClass}>
              Tip shown in app
              <input
                className={fieldClass}
                value={values.tip}
                onChange={(e) => patch("tip", e.target.value)}
              />
            </label>
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/90 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="h-9 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-5 text-[13px] font-semibold text-white shadow-sm hover:from-indigo-500 hover:to-blue-500"
          >
            {mode === "add" ? "Add code" : "Save changes"}
          </button>
        </footer>
      </form>
    </div>
  );
}
