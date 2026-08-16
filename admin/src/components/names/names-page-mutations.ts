import {
  createNameFrame,
  deleteNameFrame,
  updateNameFont,
  updateNameFrame,
} from "./names-api";
import {
  formToFrame,
  type NameFontRow,
  type NameFrameFormValues,
  type NameFrameRow,
} from "./names-data";
import { NAMES_TOAST_TITLES } from "./names-toast";
import type { RedeemToastTone } from "@/components/redeem/redeem-toast";

type Push = (
  tone: RedeemToastTone,
  title: string,
  message: string,
) => void;

export async function persistFrame(
  values: NameFrameFormValues,
  mode: "add" | "edit",
  frames: NameFrameRow[],
  editingId: string | null,
  setFrames: (fn: (prev: NameFrameRow[]) => NameFrameRow[]) => void,
  push: Push,
): Promise<string | null> {
  if (mode === "add") {
    if (frames.length >= 80) return "Frame table is full (max 80).";
    const result = formToFrame(values, `frame_${Date.now().toString(36)}`);
    if ("error" in result) return result.error;
    if (frames.some((f) => f.id === result.id)) {
      return `Frame id “${result.id}” already exists.`;
    }
    try {
      const saved = await createNameFrame(result);
      setFrames((prev) => [saved, ...prev.filter((f) => f.id !== saved.id)]);
      push("success", NAMES_TOAST_TITLES.added, `“${saved.label}” is live.`);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Failed to save frame.";
    }
  }
  if (!editingId) return "Nothing to edit.";
  const result = formToFrame({ ...values, id: editingId }, editingId);
  if ("error" in result) return result.error;
  try {
    const saved = await updateNameFrame(editingId, result);
    setFrames((prev) => prev.map((f) => (f.id === saved.id ? saved : f)));
    push("success", NAMES_TOAST_TITLES.updated, `“${saved.label}” updated.`);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Failed to update frame.";
  }
}

export async function toggleFrameRow(
  id: string,
  frames: NameFrameRow[],
  setFrames: (fn: (prev: NameFrameRow[]) => NameFrameRow[]) => void,
  push: Push,
) {
  const row = frames.find((f) => f.id === id);
  if (!row) return;
  try {
    const saved = await updateNameFrame(id, { ...row, enabled: !row.enabled });
    setFrames((prev) => prev.map((f) => (f.id === saved.id ? saved : f)));
    push(
      "success",
      NAMES_TOAST_TITLES.updated,
      `“${saved.label}” ${saved.enabled ? "live" : "off"}.`,
    );
  } catch (e) {
    push(
      "error",
      NAMES_TOAST_TITLES.error,
      e instanceof Error ? e.message : "Failed to update frame.",
    );
  }
}

export async function deleteFrameRow(
  id: string,
  frames: NameFrameRow[],
  setFrames: (fn: (prev: NameFrameRow[]) => NameFrameRow[]) => void,
  push: Push,
) {
  const row = frames.find((f) => f.id === id);
  if (!row) return;
  if (!window.confirm(`Delete frame “${row.label}”?`)) return;
  try {
    await deleteNameFrame(id);
    setFrames((prev) => prev.filter((f) => f.id !== id));
    push("success", NAMES_TOAST_TITLES.deleted, `Deleted “${row.label}”.`);
  } catch (e) {
    push(
      "error",
      NAMES_TOAST_TITLES.error,
      e instanceof Error ? e.message : "Failed to delete frame.",
    );
  }
}

export async function toggleFontRow(
  id: string,
  fonts: NameFontRow[],
  setFonts: (fn: (prev: NameFontRow[]) => NameFontRow[]) => void,
  push: Push,
) {
  const row = fonts.find((f) => f.id === id);
  if (!row) return;
  const nextEnabled = !row.enabled;
  if (!nextEnabled && !fonts.some((f) => f.id !== id && f.enabled)) {
    push(
      "error",
      NAMES_TOAST_TITLES.error,
      "At least one letter font must stay enabled.",
    );
    return;
  }
  try {
    const saved = await updateNameFont(id, { ...row, enabled: nextEnabled });
    setFonts((prev) => prev.map((f) => (f.id === saved.id ? saved : f)));
    push(
      "success",
      NAMES_TOAST_TITLES.updated,
      `“${saved.label}” ${saved.enabled ? "live" : "off"}.`,
    );
  } catch (e) {
    push(
      "error",
      NAMES_TOAST_TITLES.error,
      e instanceof Error ? e.message : "Failed to update font.",
    );
  }
}
