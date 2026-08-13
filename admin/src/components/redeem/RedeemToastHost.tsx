"use client";

import { useEffect } from "react";
import type { RedeemToastItem, RedeemToastTone } from "./redeem-toast";

const toneUi: Record<
  RedeemToastTone,
  { bar: string; icon: string; action: string }
> = {
  success: {
    bar: "bg-emerald-500",
    icon: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
    action:
      "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
  },
  error: {
    bar: "bg-rose-500",
    icon: "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
    action: "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100",
  },
  caution: {
    bar: "bg-amber-500",
    icon: "bg-amber-50 text-amber-800 ring-1 ring-amber-100",
    action: "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100",
  },
};

type Props = {
  toasts: RedeemToastItem[];
  onDismiss: (id: string) => void;
  onAction?: (id: string) => void;
};

export function RedeemToastHost({ toasts, onDismiss, onAction }: Props) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed right-4 bottom-4 z-[90] flex w-[min(100vw-2rem,20rem)] flex-col-reverse gap-2"
      aria-live="polite"
      aria-relevant="additions"
    >
      <style>{`
        @keyframes redeemToastIn {
          from { opacity: 0; transform: translate3d(12px, 8px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
      `}</style>
      {toasts.map((t) => (
        <ToastCard
          key={t.id}
          item={t}
          ui={toneUi[t.tone]}
          onDismiss={() => onDismiss(t.id)}
          onAction={
            t.actionLabel && onAction ? () => onAction(t.id) : undefined
          }
        />
      ))}
    </div>
  );
}

function ToastGlyph({ tone }: { tone: RedeemToastTone }) {
  if (tone === "success") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M5.5 12.5 10 17l8.5-9.5"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (tone === "error") {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M7 7l10 10M17 7 7 17"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 8.25v4.5M12 16.5h.01"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ToastCard({
  item,
  ui,
  onDismiss,
  onAction,
}: {
  item: RedeemToastItem;
  ui: (typeof toneUi)[RedeemToastTone];
  onDismiss: () => void;
  onAction?: () => void;
}) {
  useEffect(() => {
    if (item.durationMs <= 0) return;
    const timer = window.setTimeout(onDismiss, item.durationMs);
    return () => window.clearTimeout(timer);
  }, [item.durationMs, item.id, onDismiss]);

  return (
    <div
      role="status"
      className="pointer-events-auto overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_10px_30px_-12px_rgba(15,23,42,0.28)]"
      style={{
        animation: "redeemToastIn 220ms cubic-bezier(0.16,1,0.3,1) both",
      }}
    >
      <div className="flex">
        <div className={`w-[3px] shrink-0 ${ui.bar}`} aria-hidden />
        <div className="flex min-w-0 flex-1 items-start gap-2.5 px-3 py-2.5">
          <div
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${ui.icon}`}
            aria-hidden
          >
            <ToastGlyph tone={item.tone} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold leading-5 tracking-[-0.01em] text-slate-900">
              {item.title}
            </p>
            <p className="mt-0.5 text-[12px] leading-4 text-slate-500">
              {item.message}
            </p>
            {item.actionLabel && onAction ? (
              <button
                type="button"
                onClick={onAction}
                className={`mt-2 inline-flex h-7 items-center rounded-md border px-2.5 text-[11px] font-semibold ${ui.action}`}
              >
                {item.actionLabel}
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="-mr-0.5 -mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Dismiss"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
