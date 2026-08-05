"use client";

import { useEffect, useRef } from "react";

export type ConfirmTone = "danger" | "neutral";

type Props = {
  open: boolean;
  tone?: ConfirmTone;
  eyebrow: string;
  title: string;
  description: string;
  detail?: string;
  note?: string;
  confirmLabel: string;
  busyLabel?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

const TONE = {
  danger: {
    ring: "ring-rose-100",
    iconWrap: "bg-rose-50 text-rose-600",
    eyebrow: "text-rose-600",
    confirm: "bg-rose-600 hover:bg-rose-500",
    noteBox: "border-rose-200 bg-rose-50 text-rose-900",
  },
  neutral: {
    ring: "ring-slate-100",
    iconWrap: "bg-slate-100 text-slate-700",
    eyebrow: "text-slate-500",
    confirm: "bg-slate-900 hover:bg-slate-800",
    noteBox: "border-slate-200 bg-slate-50 text-slate-700",
  },
} as const;

export function SupportConfirmDialog({
  open,
  tone = "danger",
  eyebrow,
  title,
  description,
  detail,
  note,
  confirmLabel,
  busyLabel,
  busy = false,
  onCancel,
  onConfirm,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const skin = TONE[tone];

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="support-confirm-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
        aria-label="Cancel"
        onClick={() => {
          if (!busy) onCancel();
        }}
      />

      <div
        className={`relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ring-4 ${skin.ring}`}
      >
        <div className="flex gap-3.5 px-5 pt-5">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${skin.iconWrap}`}
          >
            {tone === "danger" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M4 7h16M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7m-8 0v11.5A1.5 1.5 0 0 0 8.5 20h7a1.5 1.5 0 0 0 1.5-1.5V7M10 11v6M14 11v6"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm-3.5-10 2.5 2.5L16 9"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>

          <div className="min-w-0">
            <p
              className={`text-[11px] font-semibold tracking-[0.12em] uppercase ${skin.eyebrow}`}
            >
              {eyebrow}
            </p>
            <h2
              id="support-confirm-title"
              className="mt-1 text-[17px] font-bold tracking-[-0.02em] text-slate-900"
            >
              {title}
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
              {description}
            </p>
          </div>
        </div>

        {detail ? (
          <div className="mx-5 mt-4 truncate rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-2.5 text-[12px] font-medium text-slate-700">
            {detail}
          </div>
        ) : null}

        {note ? (
          <div
            className={`mx-5 mt-2.5 rounded-xl border px-3.5 py-2.5 text-[12px] leading-relaxed ${skin.noteBox}`}
          >
            {note}
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3.5">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="h-10 rounded-xl bg-white px-4 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`h-10 rounded-xl px-4 text-[13px] font-semibold text-white disabled:opacity-50 ${skin.confirm}`}
          >
            {busy ? (busyLabel ?? "Working…") : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
