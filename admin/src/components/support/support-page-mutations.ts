import {
  closeSupportThread,
  deleteSupportThread,
  deleteSupportUserMessage,
  fetchSupportStats,
  markSupportRead,
  replySupportThread,
  type SupportStatsPayload,
} from "./support-api";
import type { SupportThreadRow } from "./support-data";
import { SUPPORT_TOAST_TITLES } from "./support-toast";
import type { RedeemToastTone } from "@/components/redeem/redeem-toast";

type Push = (
  tone: RedeemToastTone,
  title: string,
  message: string,
) => void;

function upsertRow(
  setRows: (fn: (prev: SupportThreadRow[]) => SupportThreadRow[]) => void,
  next: SupportThreadRow,
) {
  setRows((prev) => {
    const idx = prev.findIndex((r) => r.id === next.id);
    if (idx < 0) return [next, ...prev];
    const copy = [...prev];
    copy[idx] = next;
    return copy;
  });
}

async function refreshStats(
  setServerStats: (stats: SupportStatsPayload) => void,
) {
  setServerStats(await fetchSupportStats());
}

export async function replyThreadRow(
  id: string,
  text: string,
  rows: SupportThreadRow[],
  setRows: (fn: (prev: SupportThreadRow[]) => SupportThreadRow[]) => void,
  setServerStats: (stats: SupportStatsPayload) => void,
  push: Push,
) {
  const row = rows.find((r) => r.id === id);
  if (!row) return;
  try {
    const next = await replySupportThread(id, text);
    upsertRow(setRows, next);
    await refreshStats(setServerStats);
    push("success", SUPPORT_TOAST_TITLES.replied, `Replied to ${row.name}.`);
  } catch (e) {
    push(
      "error",
      SUPPORT_TOAST_TITLES.error,
      e instanceof Error ? e.message : "Reply failed.",
    );
  }
}

export async function closeThreadRow(
  id: string,
  rows: SupportThreadRow[],
  setRows: (fn: (prev: SupportThreadRow[]) => SupportThreadRow[]) => void,
  setServerStats: (stats: SupportStatsPayload) => void,
  push: Push,
  onClosed?: (id: string) => void,
) {
  const row = rows.find((r) => r.id === id);
  if (!row) return;
  try {
    const next = await closeSupportThread(id);
    upsertRow(setRows, next);
    await refreshStats(setServerStats);
    push("success", SUPPORT_TOAST_TITLES.closed, `Closed thread with ${row.name}.`);
    onClosed?.(id);
  } catch (e) {
    push(
      "error",
      SUPPORT_TOAST_TITLES.error,
      e instanceof Error ? e.message : "Close failed.",
    );
  }
}

export async function markThreadRead(
  id: string,
  setRows: (fn: (prev: SupportThreadRow[]) => SupportThreadRow[]) => void,
  setServerStats: (stats: SupportStatsPayload) => void,
) {
  try {
    const next = await markSupportRead(id);
    upsertRow(setRows, next);
    await refreshStats(setServerStats);
  } catch {
    // Non-blocking — drawer still usable.
  }
}

export async function deleteThreadRow(
  id: string,
  rows: SupportThreadRow[],
  setRows: (fn: (prev: SupportThreadRow[]) => SupportThreadRow[]) => void,
  setServerStats: (stats: SupportStatsPayload) => void,
  push: Push,
  onDeleted?: (id: string) => void,
) {
  const row = rows.find((r) => r.id === id);
  if (!row) return;
  try {
    await deleteSupportThread(id);
    setRows((prev) => prev.filter((r) => r.id !== id));
    await refreshStats(setServerStats);
    push(
      "success",
      SUPPORT_TOAST_TITLES.deleted,
      `Deleted conversation with ${row.name}.`,
    );
    onDeleted?.(id);
  } catch (e) {
    push(
      "error",
      SUPPORT_TOAST_TITLES.error,
      e instanceof Error ? e.message : "Delete failed.",
    );
  }
}

export async function deleteUserMessageRow(
  threadId: string,
  messageId: string,
  setRows: (fn: (prev: SupportThreadRow[]) => SupportThreadRow[]) => void,
  setServerStats: (stats: SupportStatsPayload) => void,
  push: Push,
) {
  try {
    const next = await deleteSupportUserMessage(threadId, messageId);
    upsertRow(setRows, next);
    await refreshStats(setServerStats);
    push("success", SUPPORT_TOAST_TITLES.deleted, "User message deleted.");
  } catch (e) {
    push(
      "error",
      SUPPORT_TOAST_TITLES.error,
      e instanceof Error ? e.message : "Could not delete message.",
    );
  }
}
