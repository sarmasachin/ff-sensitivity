"use client";

import { FormEvent, useEffect, useState } from "react";
import type {
  RedeemCadenceRow,
  RedeemFormValues,
  RedeemMode,
  RedeemTypeRow,
} from "./redeem-data";
import { SAFE_SCRATCH_TIP } from "./redeem-data";
import { RedeemModeChooser } from "./RedeemModeChooser";
import { RedeemFormTypeCadence } from "./RedeemFormTypeCadence";
import { RedeemFormInventory } from "./RedeemFormInventory";

type Props = {
  open: boolean;
  mode: "add" | "edit";
  initial: RedeemFormValues;
  types: RedeemTypeRow[];
  cadences: RedeemCadenceRow[];
  onClose: () => void;
  onSubmit: (values: RedeemFormValues) => string | null | Promise<string | null>;
  onCreateType: (input: {
    id: string;
    label: string;
  }) => Promise<string | null>;
  onCreateCadence: (input: {
    id: string;
    label: string;
    claimLimit?: number;
    windowHours?: number;
  }) => Promise<string | null>;
};

const fieldBase =
  "mt-0.5 w-full rounded-lg border border-slate-200/90 bg-slate-50 px-2.5 text-[12px] text-slate-900 outline-none transition-[border-color,box-shadow,background-color] placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/10";

const fieldClass = `${fieldBase} h-8`;

const areaClass = `${fieldBase} min-h-[5.5rem] resize-y overflow-y-auto py-2 font-mono text-[11px] leading-5`;

const labelClass = "block text-[10px] font-semibold text-slate-600";

export function RedeemFormModal({
  open,
  mode,
  initial,
  types,
  cadences,
  onClose,
  onSubmit,
  onCreateType,
  onCreateCadence,
}: Props) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(initial);
      setError(null);
      setSubmitting(false);
    }
  }, [open, initial]);

  if (!open) return null;

  const scratch = values.cardMode === "SCRATCH_REWARD";

  function patch<K extends keyof RedeemFormValues>(
    key: K,
    value: RedeemFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function setCardMode(next: RedeemMode) {
    setValues((prev) => ({
      ...prev,
      cardMode: next,
      tip:
        next === "SCRATCH_REWARD"
          ? prev.tip === "First Come, First Serve!" || !prev.tip.trim()
            ? SAFE_SCRATCH_TIP
            : prev.tip
          : prev.tip === SAFE_SCRATCH_TIP
            ? "First Come, First Serve!"
            : prev.tip,
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const err = await onSubmit(values);
      if (err) {
        setError(err);
        return;
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto p-3 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
        aria-label="Close dialog"
        onClick={onClose}
      />

      <form
        onSubmit={handleSubmit}
        className={[
          "relative z-10 my-auto flex w-full min-w-0 max-h-[calc(100vh-1.5rem)] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_25px_50px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/80 sm:max-h-[calc(100vh-2rem)]",
          scratch ? "sm:max-w-[920px]" : "sm:max-w-[720px]",
        ].join(" ")}
      >
        <header className="relative shrink-0 overflow-hidden border-b border-indigo-500/20 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 px-4 py-2.5 text-white">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-white/75 uppercase">
            Inventory
          </p>
          <h2 className="mt-0.5 text-[16px] font-bold tracking-[-0.03em]">
            {mode === "add" ? "Add redeem card" : "Edit redeem card"}
          </h2>
          <p className="mt-0.5 text-[11px] text-white/80">
            {scratch
              ? "Scratch reward: coins every scratch · limited codes by schedule"
              : "Single code: one secret · one winner"}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25"
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

        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-3">
          {error ? (
            <p className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[12px] font-medium text-rose-700">
              {error}
            </p>
          ) : null}

          {mode === "add" ? (
            <RedeemModeChooser mode={values.cardMode} onPick={setCardMode} />
          ) : null}

          <p className="mb-1.5 text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
            Basics
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className={`${labelClass} sm:col-span-2`}>
              Title
              <input
                className={fieldClass}
                value={values.title}
                onChange={(e) => patch("title", e.target.value)}
                placeholder="Daily scratch coins"
                required
              />
            </label>
            <label className={labelClass}>
              Value
              <input
                className={fieldClass}
                value={values.valueLabel}
                onChange={(e) => patch("valueLabel", e.target.value)}
                placeholder={scratch ? "Coins + limited codes" : "₹50 INR"}
                required
              />
            </label>
            {!scratch ? (
              <label className={`${labelClass} sm:col-span-3`}>
                Full code
                <input
                  className={`${fieldClass} font-mono tracking-wide`}
                  value={values.codeSecret}
                  onChange={(e) => patch("codeSecret", e.target.value)}
                  placeholder={
                    mode === "edit"
                      ? "Leave blank to keep current code"
                      : "XXXX-XXXX-XXXX-XXXX"
                  }
                  required={mode === "add"}
                />
              </label>
            ) : (
              <label className={`${labelClass} sm:col-span-3`}>
                {mode === "add" ? "Code pool (one per line)" : "Append codes (one per line)"}
                <textarea
                  className={areaClass}
                  rows={4}
                  value={values.codePoolText}
                  onChange={(e) => patch("codePoolText", e.target.value)}
                  placeholder={"AAAA-BBBB-CCCC\nDDDD-EEEE-FFFF"}
                  required={mode === "add"}
                />
              </label>
            )}
          </div>

          <RedeemFormInventory
            scratch={scratch}
            values={values}
            types={types}
            cadences={cadences}
            patch={patch}
          />

          <RedeemFormTypeCadence
            onCreateType={onCreateType}
            onCreateCadence={onCreateCadence}
            onTypeCreated={(id) => patch("type", id)}
            onCadenceCreated={(id) => patch("cadence", id)}
            onError={setError}
          />

          <p className="mt-2.5 mb-1.5 text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
            Delivery
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
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

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/90 px-4 py-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-lg border border-slate-200 bg-white px-4 text-[12px] font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="h-8 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-5 text-[12px] font-semibold text-white shadow-sm hover:from-indigo-500 hover:to-blue-500 disabled:opacity-60"
          >
            {submitting
              ? "Saving…"
              : mode === "add"
                ? scratch
                  ? "Add scratch card"
                  : "Add code"
                : "Save changes"}
          </button>
        </footer>
      </form>
    </div>
  );
}
