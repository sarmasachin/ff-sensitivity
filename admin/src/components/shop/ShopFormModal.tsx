"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  SHOP_CATEGORY_LABEL,
  type ShopCategory,
  type ShopFormValues,
} from "./shop-data";

type Props = {
  open: boolean;
  mode: "add" | "edit";
  initial: ShopFormValues;
  onClose: () => void;
  onSubmit: (values: ShopFormValues) => string | null;
};

const fieldClass =
  "mt-1 h-9 w-full rounded-lg border border-slate-200/90 bg-slate-50 px-3 text-[13px] text-slate-900 outline-none transition-[border-color,box-shadow,background-color] placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-500/10";

const labelClass = "block text-[11px] font-semibold text-slate-600";

const CATEGORIES = Object.keys(SHOP_CATEGORY_LABEL) as ShopCategory[];

export function ShopFormModal({
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

  function patch<K extends keyof ShopFormValues>(
    key: K,
    value: ShopFormValues[K],
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
        <header className="relative shrink-0 overflow-hidden border-b border-amber-500/20 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-5 py-3.5 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-8 -right-6 h-28 w-28 rounded-full bg-white/15 blur-2xl"
          />
          <p className="text-[10px] font-semibold tracking-[0.16em] text-white/75 uppercase">
            Catalog
          </p>
          <h2 className="mt-0.5 text-[18px] font-bold tracking-[-0.03em]">
            {mode === "add" ? "Add shop item" : "Edit shop item"}
          </h2>
          <p className="mt-0.5 text-[11px] text-white/85">
            Local draft until Shop API is connected.
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
                placeholder="Quiz Double Coins"
                required
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Subtitle
              <input
                className={fieldClass}
                value={values.subtitle}
                onChange={(e) => patch("subtitle", e.target.value)}
                placeholder="What the buyer gets"
                required
              />
            </label>
            <label className={labelClass}>
              Item ID
              <input
                className={`${fieldClass} font-mono text-[12px]`}
                value={values.id}
                onChange={(e) => patch("id", e.target.value)}
                placeholder="boost_quiz_double"
                disabled={mode === "edit"}
                required={mode === "add"}
              />
            </label>
            <label className={labelClass}>
              Reward tag
              <input
                className={fieldClass}
                value={values.rewardTag}
                onChange={(e) => patch("rewardTag", e.target.value)}
                placeholder="2× QUIZ"
                required
              />
            </label>
          </div>

          <p className="mt-3.5 mb-2 text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
            Pricing & rules
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <label className={labelClass}>
              Category
              <select
                className={fieldClass}
                value={values.category}
                onChange={(e) =>
                  patch("category", e.target.value as ShopCategory)
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {SHOP_CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Price (coins)
              <input
                type="number"
                min={1}
                className={fieldClass}
                value={values.priceCoins}
                onChange={(e) => patch("priceCoins", e.target.value)}
                required
              />
            </label>
            <label className={labelClass}>
              Stock limit
              <input
                type="number"
                min={0}
                className={fieldClass}
                value={values.stockLimit}
                onChange={(e) => patch("stockLimit", e.target.value)}
                placeholder="Empty = unlimited"
              />
            </label>
            <div className="flex flex-col justify-center gap-2">
              <label className="flex items-center gap-2 text-[12px] font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={values.enabled}
                  onChange={(e) => patch("enabled", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                Enabled in app
              </label>
              <label className="flex items-center gap-2 text-[12px] font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={values.oneTime}
                  onChange={(e) => patch("oneTime", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                One-time purchase
              </label>
            </div>
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="h-9 rounded-lg bg-amber-600 px-4 text-[13px] font-semibold text-white hover:bg-amber-500"
          >
            {mode === "add" ? "Add item" : "Save changes"}
          </button>
        </footer>
      </form>
    </div>
  );
}
