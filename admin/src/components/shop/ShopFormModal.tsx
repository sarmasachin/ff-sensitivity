"use client";

import { FormEvent, useEffect, useState } from "react";
import type { ShopCategoryRow, ShopFormValues } from "./shop-data";
import { titleToShopItemId } from "./shop-data";

type Props = {
  open: boolean;
  mode: "add" | "edit";
  initial: ShopFormValues;
  categories: ShopCategoryRow[];
  onClose: () => void;
  onSubmit: (
    values: ShopFormValues,
  ) => string | null | Promise<string | null>;
  onCreateCategory: (input: {
    id: string;
    label: string;
    isBoost: boolean;
  }) => Promise<string | null>;
};

const fieldClass =
  "mt-1 h-9 w-full rounded-lg border border-slate-200/90 bg-slate-50 px-3 text-[13px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-500/10";
const labelClass = "block text-[11px] font-semibold text-slate-600";

export function ShopFormModal({
  open,
  mode,
  initial,
  categories,
  onClose,
  onSubmit,
  onCreateCategory,
}: Props) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [newCatId, setNewCatId] = useState("");
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatBoost, setNewCatBoost] = useState(false);
  const [addingCat, setAddingCat] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(initial);
      setError(null);
      setSubmitting(false);
      setNewCatId("");
      setNewCatLabel("");
      setNewCatBoost(false);
    }
  }, [open, initial]);

  if (!open) return null;

  function patch<K extends keyof ShopFormValues>(
    key: K,
    value: ShopFormValues[K],
  ) {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      if (mode === "add" && key === "title" && typeof value === "string") {
        next.id = titleToShopItemId(value);
      }
      return next;
    });
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

  async function handleAddCategory() {
    if (addingCat) return;
    setError(null);
    const id = newCatId.trim().toUpperCase();
    const label = newCatLabel.trim();
    if (id.length < 2 || !/^[A-Z][A-Z0-9_]*$/.test(id)) {
      setError(
        "Category ID must start with a letter and use A–Z, 0–9, underscore only (2–32).",
      );
      return;
    }
    if (label.length < 2) {
      setError("Category label must be at least 2 characters.");
      return;
    }
    setAddingCat(true);
    try {
      const err = await onCreateCategory({
        id,
        label,
        isBoost: newCatBoost,
      });
      if (err) {
        setError(err);
        return;
      }
      patch("category", id);
      setNewCatId("");
      setNewCatLabel("");
      setNewCatBoost(false);
    } finally {
      setAddingCat(false);
    }
  }

  const enabledCats = categories.filter((c) => c.enabled);

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
        className="relative z-10 flex max-h-[90vh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_25px_50px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/80"
      >
        <header className="relative shrink-0 border-b border-amber-500/20 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-5 py-3.5 text-white">
          <h2 className="text-[18px] font-bold tracking-[-0.03em]">
            {mode === "add" ? "Add shop item" : "Edit shop item"}
          </h2>
          <p className="mt-0.5 text-[11px] text-white/85">
            Saved to live Postgres — same catalog the app purchases use.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25"
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="overflow-y-auto px-5 py-3.5">
          {error ? (
            <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-700">
              {error}
            </p>
          ) : null}

          <div className="grid gap-2.5 sm:grid-cols-2">
            <label className={`${labelClass} sm:col-span-2`}>
              Title
              <input
                className={fieldClass}
                value={values.title}
                onChange={(e) => patch("title", e.target.value)}
                required
              />
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Subtitle
              <input
                className={fieldClass}
                value={values.subtitle}
                onChange={(e) => patch("subtitle", e.target.value)}
                required
              />
            </label>
            <label className={labelClass}>
              Item ID
              <input
                className={`${fieldClass} font-mono text-[12px] ${mode === "add" ? "bg-slate-100 text-slate-600" : ""}`}
                value={values.id}
                onChange={(e) => patch("id", e.target.value)}
                disabled
                readOnly
                required={mode === "add"}
                placeholder={mode === "add" ? "Auto from title" : undefined}
                title={
                  mode === "add"
                    ? "Generated automatically from title"
                    : "ID cannot be changed after create"
                }
              />
              {mode === "add" ? (
                <span className="mt-1 block text-[10px] font-medium text-slate-400">
                  Auto from title (a–z, 0–9, _)
                </span>
              ) : null}
            </label>
            <label className={labelClass}>
              Reward tag
              <input
                className={fieldClass}
                value={values.rewardTag}
                onChange={(e) => patch("rewardTag", e.target.value)}
                required
              />
            </label>
            <label className={labelClass}>
              Category
              <select
                className={fieldClass}
                value={values.category}
                onChange={(e) => patch("category", e.target.value)}
                required
              >
                <option value="">Select category…</option>
                {enabledCats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
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
            <label className={labelClass}>
              Sort order
              <input
                type="number"
                min={0}
                max={9999}
                className={fieldClass}
                value={values.sortOrder}
                onChange={(e) => patch("sortOrder", e.target.value)}
              />
            </label>
          </div>

          <div className="mt-3 grid gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-3 sm:grid-cols-[1fr_1fr_auto_auto]">
            <input
              className={fieldClass}
              value={newCatId}
              onChange={(e) => setNewCatId(e.target.value)}
              placeholder="NEW_CAT id"
            />
            <input
              className={fieldClass}
              value={newCatLabel}
              onChange={(e) => setNewCatLabel(e.target.value)}
              placeholder="Label"
            />
            <label className="flex items-center gap-2 text-[12px] text-slate-600">
              <input
                type="checkbox"
                checked={newCatBoost}
                onChange={(e) => setNewCatBoost(e.target.checked)}
              />
              Boost
            </label>
            <button
              type="button"
              disabled={addingCat}
              onClick={() => {
                void handleAddCategory();
              }}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {addingCat ? "Adding…" : "Add category"}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-4 text-[12px] text-slate-600">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={values.enabled}
                onChange={(e) => patch("enabled", e.target.checked)}
              />
              Enabled
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={values.oneTime}
                onChange={(e) => patch("oneTime", e.target.checked)}
              />
              One-time buy
            </label>
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="h-9 rounded-lg bg-amber-600 px-4 text-[13px] font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "Saving…" : mode === "add" ? "Add item" : "Save changes"}
          </button>
        </footer>
      </form>
    </div>
  );
}
