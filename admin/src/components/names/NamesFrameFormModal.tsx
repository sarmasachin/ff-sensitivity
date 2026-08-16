"use client";

import { useEffect, useState } from "react";
import {
  previewTag,
  type NameFrameFormValues,
} from "./names-data";

type Props = {
  open: boolean;
  mode: "add" | "edit";
  initial: NameFrameFormValues;
  onClose: () => void;
  onSave: (values: NameFrameFormValues) => Promise<string | null>;
};

const fieldClass =
  "mt-1 h-10 w-full rounded-lg border border-slate-200/90 bg-white px-3 text-[13px] text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10";
const labelClass = "block text-[11px] font-semibold text-slate-600";

export function NamesFrameFormModal({
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

  function patch<K extends keyof NameFrameFormValues>(
    key: K,
    value: NameFrameFormValues[K],
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

  const preview = previewTag(values.prefix, "GHOST", values.suffix);

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
            <p className="text-[11px] font-semibold tracking-[0.12em] text-teal-700 uppercase">
              Frame
            </p>
            <h2 className="mt-0.5 text-[17px] font-bold text-slate-900">
              {mode === "add" ? "Add frame" : "Edit frame"}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!busy) onClose();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
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
              placeholder="classic"
              disabled={mode === "edit"}
            />
          </label>
          <label className={labelClass}>
            Label
            <input
              className={fieldClass}
              value={values.label}
              onChange={(e) => patch("label", e.target.value)}
              placeholder="Classic"
              required
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Prefix
              <input
                className={`${fieldClass} font-mono`}
                value={values.prefix}
                onChange={(e) => patch("prefix", e.target.value)}
                placeholder="꧁"
              />
            </label>
            <label className={labelClass}>
              Suffix
              <input
                className={`${fieldClass} font-mono`}
                value={values.suffix}
                onChange={(e) => patch("suffix", e.target.value)}
                placeholder="꧂"
              />
            </label>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3">
            <p className="text-[11px] font-semibold text-slate-500 uppercase">
              Preview
            </p>
            <p className="mt-1 truncate font-mono text-[16px] text-slate-900">
              {preview || "—"}
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-700">
              <input
                type="checkbox"
                checked={values.enabled}
                onChange={(e) => patch("enabled", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-teal-700"
              />
              Enabled
            </label>
            <label className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-700">
              <input
                type="checkbox"
                checked={values.premium}
                onChange={(e) => patch("premium", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-teal-700"
              />
              Premium
            </label>
          </div>

          {error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-700">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-3">
          <button
            type="button"
            onClick={() => {
              if (!busy) onClose();
            }}
            disabled={busy}
            className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="h-9 rounded-lg bg-slate-900 px-4 text-[13px] font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {busy
              ? "Saving…"
              : mode === "add"
                ? "Add frame"
                : "Save changes"}
          </button>
        </footer>
      </form>
    </div>
  );
}
