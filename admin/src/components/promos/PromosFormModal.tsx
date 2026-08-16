"use client";

import { useEffect, useState } from "react";
import {
  type PromoFormValues,
  type PromoPlacement,
} from "./promo-data";

type Props = {
  open: boolean;
  mode: "add" | "edit";
  initial: PromoFormValues;
  onClose: () => void;
  onSave: (values: PromoFormValues) => Promise<string | null>;
};

const fieldClass =
  "mt-1 h-10 w-full rounded-lg border border-slate-200/90 bg-white px-3 text-[13px] text-slate-900 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10";
const labelClass = "block text-[11px] font-semibold text-slate-600";

export function PromosFormModal({
  open,
  mode,
  initial,
  onClose,
  onSave,
}: Props) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(initial);
      setError(null);
      setBusy(false);
    }
  }, [open, initial]);

  if (!open) return null;

  function patch<K extends keyof PromoFormValues>(
    key: K,
    value: PromoFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const err = await onSave(values);
      if (err) {
        setError(err);
        return;
      }
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        onClick={() => {
          if (!busy) onClose();
        }}
      />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 flex w-full max-w-[560px] flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_25px_50px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/80 sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.12em] text-amber-800 uppercase">
              Promo
            </p>
            <h2 className="mt-0.5 text-[17px] font-bold text-slate-900">
              {mode === "add" ? "Add promo" : "Edit promo"}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!busy) onClose();
            }}
            disabled={busy}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto px-5 py-4">
          <label className={labelClass}>
            ID
            <input
              className={`${fieldClass} font-mono`}
              value={values.id}
              onChange={(e) => patch("id", e.target.value)}
              placeholder="promo_challenge_week"
              disabled={mode === "edit" || busy}
            />
          </label>
          <label className={labelClass}>
            Title
            <input
              className={fieldClass}
              value={values.title}
              onChange={(e) => patch("title", e.target.value)}
              placeholder="Daily Challenge week"
              required
              disabled={busy}
            />
          </label>
          <label className={labelClass}>
            Subtitle
            <input
              className={fieldClass}
              value={values.subtitle}
              onChange={(e) => patch("subtitle", e.target.value)}
              placeholder="Short supporting line for the banner"
              disabled={busy}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Image label
              <input
                className={`${fieldClass} font-mono`}
                value={values.imageLabel}
                onChange={(e) => patch("imageLabel", e.target.value)}
                placeholder="challenge-hero"
                disabled={busy}
              />
            </label>
            <label className={labelClass}>
              Sort order
              <input
                type="number"
                min={1}
                className={fieldClass}
                value={values.sortOrder}
                onChange={(e) => patch("sortOrder", e.target.value)}
                required
                disabled={busy}
              />
            </label>
          </div>
          <label className={labelClass}>
            Deep link
            <input
              className={`${fieldClass} font-mono`}
              value={values.deepLink}
              onChange={(e) => patch("deepLink", e.target.value)}
              placeholder="ffops://challenge"
              required
              disabled={busy}
            />
          </label>
          <label className={labelClass}>
            Placement
            <select
              className={fieldClass}
              value={values.placement}
              onChange={(e) =>
                patch("placement", e.target.value as PromoPlacement)
              }
              disabled={busy}
            >
              <option value="HOME_BANNER">Home banner</option>
              <option value="HOME_STRIP">Home strip</option>
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Starts
              <input
                className={`${fieldClass} font-mono`}
                value={values.startsAt}
                onChange={(e) => patch("startsAt", e.target.value)}
                placeholder="2026-08-03 00:00"
                required
                disabled={busy}
              />
            </label>
            <label className={labelClass}>
              Ends
              <input
                className={`${fieldClass} font-mono`}
                value={values.endsAt}
                onChange={(e) => patch("endsAt", e.target.value)}
                placeholder="2026-08-31 23:59"
                required
                disabled={busy}
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-[13px] font-medium text-slate-700">
            <input
              type="checkbox"
              checked={values.enabled}
              onChange={(e) => patch("enabled", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-amber-700 focus:ring-amber-500/30"
              disabled={busy}
            />
            Enabled (eligible when inside schedule)
          </label>
          {error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-800">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-3">
          <button
            type="button"
            onClick={() => {
              if (!busy) onClose();
            }}
            disabled={busy}
            className="h-9 rounded-lg px-3.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="h-9 rounded-lg bg-slate-900 px-4 text-[13px] font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
          >
            {busy
              ? "Saving…"
              : mode === "add"
                ? "Create promo"
                : "Save changes"}
          </button>
        </footer>
      </form>
    </div>
  );
}
