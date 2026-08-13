export type RedeemToastTone = "success" | "error" | "caution";

export type RedeemToastItem = {
  id: string;
  tone: RedeemToastTone;
  title: string;
  message: string;
  actionLabel?: string;
  durationMs: number;
};

let toastSeq = 0;

export function createRedeemToast(
  tone: RedeemToastTone,
  title: string,
  message: string,
  opts?: { actionLabel?: string; durationMs?: number },
): RedeemToastItem {
  toastSeq += 1;
  const durationMs =
    opts?.durationMs ??
    (tone === "error" ? 0 : tone === "caution" ? 5000 : 3400);
  return {
    id: `rt-${Date.now()}-${toastSeq}`,
    tone,
    title,
    message,
    actionLabel: opts?.actionLabel,
    durationMs,
  };
}

export const REDEEM_TOAST_TITLES = {
  success: "Saved",
  added: "Added",
  updated: "Updated",
  deleted: "Deleted",
  revealed: "Revealed",
  error: "Something went wrong",
  loadError: "Couldn’t load inventory",
  caution: "Needs attention",
} as const;
