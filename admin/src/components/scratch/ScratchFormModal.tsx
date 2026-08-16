"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  SCRATCH_KIND_LABEL,
  type ScratchFormValues,
  type ScratchKind,
} from "./scratch-data";

type Props = {
  open: boolean;
  mode: "add" | "edit";
  initial: ScratchFormValues;
  onClose: () => void;
  onSubmit: (values: ScratchFormValues) => Promise<string | null>;
};

const fieldClass =
  "mt-1 h-9 w-full rounded-lg border border-slate-200/90 bg-slate-50 px-3 text-[13px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-fuchsia-400 focus:bg-white focus:ring-2 focus:ring-fuchsia-500/10";

const labelClass = "block text-[11px] font-semibold text-slate-600";

const KINDS = Object.keys(SCRATCH_KIND_LABEL) as ScratchKind[];

export function ScratchFormModal({
  open,
  mode,
  initial,
  onClose,
  onSubmit,
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

  function patch<K extends keyof ScratchFormValues>(
    key: K,
    value: ScratchFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const err = await onSubmit(values);
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
        aria-label="Close dialog"
        onClick={() => {
          if (!busy) onClose();
        }}
      />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-[640px] overflow-hidden rounded-2xl bg-white shadow-[0_25px_50px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/80"
      >
        <header className="relative overflow-hidden bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-500 px-5 py-3.5 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-8 -right-6 h-24 w-24 rounded-full bg-white/15 blur-2xl"
          />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.16em] text-white/75 uppercase">
                Prize table
              </p>
              <h2 className="mt-0.5 text-[17px] font-bold tracking-[-0.03em]">
                {mode === "add" ? "Add scratch prize" : "Edit scratch prize"}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!busy) onClose();
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25"
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
        </header>

        <div className="px-5 py-4">
          {error ? (
            <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-700">
              {error}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
            <label className={`${labelClass} col-span-2`}>
              Title
              <input
                className={fieldClass}
                value={values.title}
                onChange={(e) => patch("title", e.target.value)}
                placeholder="Lucky +50"
                required
              />
            </label>
            <label className={`${labelClass} col-span-2`}>
              Detail
              <input
                className={fieldClass}
                value={values.detail}
                onChange={(e) => patch("detail", e.target.value)}
                placeholder="What the player sees after scratch"
                required
              />
            </label>
            <label className={labelClass}>
              Prize ID
              <input
                className={`${fieldClass} font-mono text-[12px]`}
                value={values.id}
                onChange={(e) => patch("id", e.target.value)}
                placeholder="prize_id"
                disabled={mode === "edit"}
                required={mode === "add"}
              />
            </label>
            <label className={labelClass}>
              Reward label
              <input
                className={fieldClass}
                value={values.rewardLabel}
                onChange={(e) => patch("rewardLabel", e.target.value)}
                placeholder="+50 coins"
                required
              />
            </label>
            <label className={labelClass}>
              Kind
              <select
                className={fieldClass}
                value={values.kind}
                onChange={(e) => patch("kind", e.target.value as ScratchKind)}
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {SCRATCH_KIND_LABEL[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Coin reward
              <input
                type="number"
                min={0}
                className={fieldClass}
                value={values.coinReward}
                onChange={(e) => patch("coinReward", e.target.value)}
                required
              />
            </label>
            <label className={labelClass}>
              Odds %
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                className={fieldClass}
                value={values.oddsPercent}
                onChange={(e) => patch("oddsPercent", e.target.value)}
                required
              />
            </label>
            <label className={labelClass}>
              Streak days
              <input
                type="number"
                min={1}
                className={fieldClass}
                value={values.streakDays}
                onChange={(e) => patch("streakDays", e.target.value)}
                placeholder="Milestone only"
              />
            </label>
            <label className="col-span-2 flex items-center gap-2 pt-0.5 text-[13px] font-medium text-slate-700">
              <input
                type="checkbox"
                checked={values.enabled}
                onChange={(e) => patch("enabled", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-fuchsia-600 focus:ring-fuchsia-500"
              />
              Enabled in prize table
            </label>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-3">
          <button
            type="button"
            onClick={() => {
              if (!busy) onClose();
            }}
            disabled={busy}
            className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="h-9 rounded-xl bg-fuchsia-600 px-4 text-[13px] font-semibold text-white hover:bg-fuchsia-500 disabled:opacity-50"
          >
            {busy
              ? "Saving…"
              : mode === "add"
                ? "Add prize"
                : "Save changes"}
          </button>
        </footer>
      </form>
    </div>
  );
}
