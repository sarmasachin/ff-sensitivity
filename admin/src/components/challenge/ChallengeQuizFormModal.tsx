"use client";

import { FormEvent, useEffect, useState } from "react";
import type { QuizFormValues } from "./challenge-data";

type Props = {
  open: boolean;
  mode: "add" | "edit";
  initial: QuizFormValues;
  onClose: () => void;
  onSubmit: (values: QuizFormValues) => Promise<string | null>;
};

const fieldClass =
  "mt-1 h-9 w-full rounded-lg border border-slate-200/90 bg-slate-50 px-3 text-[13px] text-slate-900 outline-none focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-500/10";
const labelClass = "block text-[11px] font-semibold text-slate-600";

export function ChallengeQuizFormModal({
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

  function patch<K extends keyof QuizFormValues>(key: K, value: QuizFormValues[K]) {
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
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
        className="relative z-10 flex w-full max-w-[640px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_25px_50px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/80"
      >
        <header className="relative shrink-0 bg-gradient-to-r from-orange-600 via-rose-500 to-fuchsia-600 px-5 py-3.5 text-white">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-white/75 uppercase">
            Quiz bank
          </p>
          <h2 className="mt-0.5 text-[18px] font-bold tracking-[-0.03em]">
            {mode === "add" ? "Add question" : "Edit question"}
          </h2>
          <button
            type="button"
            onClick={() => {
              if (!busy) onClose();
            }}
            className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="px-5 py-3.5">
          {error ? (
            <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-700">
              {error}
            </p>
          ) : null}
          <div className="grid gap-2.5 sm:grid-cols-2">
            <label className={`${labelClass} sm:col-span-2`}>
              Question
              <input
                className={fieldClass}
                value={values.question}
                onChange={(e) => patch("question", e.target.value)}
                required
              />
            </label>
            <label className={labelClass}>
              Option A
              <input className={fieldClass} value={values.option0} onChange={(e) => patch("option0", e.target.value)} required />
            </label>
            <label className={labelClass}>
              Option B
              <input className={fieldClass} value={values.option1} onChange={(e) => patch("option1", e.target.value)} required />
            </label>
            <label className={labelClass}>
              Option C
              <input className={fieldClass} value={values.option2} onChange={(e) => patch("option2", e.target.value)} required />
            </label>
            <label className={labelClass}>
              Option D
              <input className={fieldClass} value={values.option3} onChange={(e) => patch("option3", e.target.value)} required />
            </label>
            <label className={labelClass}>
              Correct answer
              <select
                className={fieldClass}
                value={values.correctIndex}
                onChange={(e) => patch("correctIndex", e.target.value)}
              >
                <option value="0">A</option>
                <option value="1">B</option>
                <option value="2">C</option>
                <option value="3">D</option>
              </select>
            </label>
            <label className={labelClass}>
              Question ID
              <input
                className={`${fieldClass} font-mono text-[12px]`}
                value={values.id}
                onChange={(e) => patch("id", e.target.value)}
                disabled={mode === "edit"}
                placeholder="q8"
              />
            </label>
            <label className="flex items-center gap-2 text-[12px] font-medium text-slate-700 sm:col-span-2">
              <input
                type="checkbox"
                checked={values.enabled}
                onChange={(e) => patch("enabled", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
              />
              Enabled in rotation
            </label>
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="h-9 rounded-lg bg-orange-600 px-4 text-[13px] font-semibold text-white hover:bg-orange-500 disabled:opacity-50"
          >
            {busy
              ? "Saving…"
              : mode === "add"
                ? "Add question"
                : "Save changes"}
          </button>
        </footer>
      </form>
    </div>
  );
}
