import {
  createScratchPrize,
  deleteScratchPrize,
  updateScratchPrize,
} from "./scratch-api";
import {
  formToRow,
  type ScratchFormValues,
  type ScratchPrizeRow,
} from "./scratch-data";
import { SCRATCH_TOAST_TITLES } from "./scratch-toast";
import type { RedeemToastTone } from "@/components/redeem/redeem-toast";

type Push = (
  tone: RedeemToastTone,
  title: string,
  message: string,
) => void;

export async function persistPrize(
  values: ScratchFormValues,
  mode: "add" | "edit",
  rows: ScratchPrizeRow[],
  editingId: string | null,
  setRows: (fn: (prev: ScratchPrizeRow[]) => ScratchPrizeRow[]) => void,
  push: Push,
): Promise<string | null> {
  if (mode === "add") {
    if (rows.length >= 200) return "Prize table is full (max 200).";
    const id = values.id.trim() || `prize_${Date.now()}`;
    if (rows.some((r) => r.id === id)) {
      return "A prize with this ID already exists.";
    }
    const result = formToRow(values, id);
    if ("error" in result) return result.error;
    try {
      const saved = await createScratchPrize(result);
      setRows((prev) => [saved, ...prev.filter((r) => r.id !== saved.id)]);
      push("success", SCRATCH_TOAST_TITLES.added, `“${saved.title}” is live.`);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Failed to save prize.";
    }
  }
  if (!editingId) return "Nothing to edit.";
  const result = formToRow({ ...values, id: editingId }, editingId);
  if ("error" in result) return result.error;
  try {
    const saved = await updateScratchPrize(editingId, result);
    setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    push("success", SCRATCH_TOAST_TITLES.updated, `“${saved.title}” updated.`);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Failed to update prize.";
  }
}

export async function togglePrizeRow(
  id: string,
  rows: ScratchPrizeRow[],
  setRows: (fn: (prev: ScratchPrizeRow[]) => ScratchPrizeRow[]) => void,
  push: Push,
) {
  const row = rows.find((r) => r.id === id);
  if (!row) return;
  try {
    const saved = await updateScratchPrize(id, { ...row, enabled: !row.enabled });
    setRows((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    push(
      "success",
      SCRATCH_TOAST_TITLES.updated,
      `“${saved.title}” ${saved.enabled ? "live" : "off"}.`,
    );
  } catch (e) {
    push(
      "error",
      SCRATCH_TOAST_TITLES.error,
      e instanceof Error ? e.message : "Failed to update prize.",
    );
  }
}

export async function deletePrizeRow(
  id: string,
  rows: ScratchPrizeRow[],
  setRows: (fn: (prev: ScratchPrizeRow[]) => ScratchPrizeRow[]) => void,
  push: Push,
) {
  const row = rows.find((r) => r.id === id);
  if (!row) return;
  if (!window.confirm(`Delete “${row.title}”?`)) return;
  try {
    await deleteScratchPrize(id);
    setRows((prev) => prev.filter((r) => r.id !== id));
    push("success", SCRATCH_TOAST_TITLES.deleted, `Deleted “${row.title}”.`);
  } catch (e) {
    push(
      "error",
      SCRATCH_TOAST_TITLES.error,
      e instanceof Error ? e.message : "Failed to delete prize.",
    );
  }
}
