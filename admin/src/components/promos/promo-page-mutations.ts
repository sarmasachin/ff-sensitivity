import {
  createPromo,
  deletePromo,
  reorderPromos,
  updatePromo,
} from "./promo-api";
import { sortByOrder } from "./promo-access";
import {
  formToPromo,
  formatPromoStamp,
  type PromoFormValues,
  type PromoRow,
} from "./promo-data";
import { PROMOS_TOAST_TITLES } from "./promo-toast";
import type { RedeemToastTone } from "@/components/redeem/redeem-toast";

type Push = (
  tone: RedeemToastTone,
  title: string,
  message: string,
) => void;

const MAX_PROMOS = 40;

function compactRows(rows: PromoRow[]): PromoRow[] {
  return sortByOrder(rows).map((row, i) => ({ ...row, sortOrder: i + 1 }));
}

export async function persistPromo(
  values: PromoFormValues,
  mode: "add" | "edit",
  rows: PromoRow[],
  editingId: string | null,
  setRows: (fn: (prev: PromoRow[]) => PromoRow[]) => void,
  push: Push,
): Promise<string | null> {
  if (mode === "add") {
    if (rows.length >= MAX_PROMOS) return "Promo table is full (max 40).";
    const result = formToPromo(
      values,
      `promo_${Date.now().toString(36)}`,
      formatPromoStamp(new Date()),
    );
    if ("error" in result) return result.error;
    if (rows.some((r) => r.id === result.id)) {
      return `Promo id “${result.id}” already exists.`;
    }
    try {
      const saved = await createPromo(result);
      setRows((prev) =>
        compactRows([saved, ...prev.filter((r) => r.id !== saved.id)]),
      );
      push("success", PROMOS_TOAST_TITLES.added, `“${saved.title}” is live.`);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Failed to save promo.";
    }
  }
  if (!editingId) return "Nothing to edit.";
  const result = formToPromo(
    { ...values, id: editingId },
    editingId,
    formatPromoStamp(new Date()),
  );
  if ("error" in result) return result.error;
  try {
    const saved = await updatePromo(editingId, result);
    setRows((prev) =>
      compactRows(prev.map((r) => (r.id === saved.id ? saved : r))),
    );
    push("success", PROMOS_TOAST_TITLES.updated, `“${saved.title}” updated.`);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Failed to update promo.";
  }
}

export async function togglePromoRow(
  id: string,
  rows: PromoRow[],
  setRows: (fn: (prev: PromoRow[]) => PromoRow[]) => void,
  push: Push,
) {
  const row = rows.find((r) => r.id === id);
  if (!row) return;
  try {
    const saved = await updatePromo(id, { ...row, enabled: !row.enabled });
    setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    push(
      "success",
      PROMOS_TOAST_TITLES.updated,
      `“${saved.title}” ${saved.enabled ? "live" : "off"}.`,
    );
  } catch (e) {
    push(
      "error",
      PROMOS_TOAST_TITLES.error,
      e instanceof Error ? e.message : "Failed to update promo.",
    );
  }
}

export async function deletePromoRow(
  id: string,
  rows: PromoRow[],
  setRows: (fn: (prev: PromoRow[]) => PromoRow[]) => void,
  push: Push,
) {
  const row = rows.find((r) => r.id === id);
  if (!row) return;
  if (!window.confirm(`Delete promo “${row.title}”?`)) return;
  try {
    await deletePromo(id);
    setRows((prev) => compactRows(prev.filter((r) => r.id !== id)));
    push("success", PROMOS_TOAST_TITLES.deleted, `Deleted “${row.title}”.`);
  } catch (e) {
    push(
      "error",
      PROMOS_TOAST_TITLES.error,
      e instanceof Error ? e.message : "Failed to delete promo.",
    );
  }
}

export async function movePromoRow(
  id: string,
  dir: -1 | 1,
  rows: PromoRow[],
  setRows: (fn: (prev: PromoRow[]) => PromoRow[]) => void,
  push: Push,
) {
  const ordered = sortByOrder(rows);
  const idx = ordered.findIndex((r) => r.id === id);
  const swap = idx + dir;
  if (idx < 0 || swap < 0 || swap >= ordered.length) return;
  const next = [...ordered];
  [next[idx], next[swap]] = [next[swap], next[idx]];
  try {
    const saved = await reorderPromos(next.map((r) => r.id));
    setRows(sortByOrder(saved));
    push("success", PROMOS_TOAST_TITLES.updated, "Promo order is live.");
  } catch (e) {
    push(
      "error",
      PROMOS_TOAST_TITLES.error,
      e instanceof Error ? e.message : "Failed to reorder promos.",
    );
  }
}
