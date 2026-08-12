import { apiFetch } from "@/lib/api";
import type { RedeemFormValues, RedeemListRow } from "./redeem-data";

export async function fetchRedeemCodes(): Promise<RedeemListRow[]> {
  const data = await apiFetch<{ codes: RedeemListRow[] }>(
    "/api/v1/admin/redeem",
  );
  return data.codes ?? [];
}

export async function createRedeemCode(
  body: Record<string, unknown>,
): Promise<RedeemListRow> {
  return apiFetch<RedeemListRow>("/api/v1/admin/redeem", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateRedeemCode(
  id: string,
  body: Record<string, unknown>,
): Promise<RedeemListRow> {
  return apiFetch<RedeemListRow>(
    `/api/v1/admin/redeem/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

export async function deleteRedeemCode(id: string): Promise<void> {
  await apiFetch<{ ok: true }>(
    `/api/v1/admin/redeem/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

export async function revealRedeemCode(
  id: string,
  currentPassword?: string,
): Promise<{ id: string; title: string; code: string }> {
  return apiFetch(`/api/v1/admin/redeem/${encodeURIComponent(id)}/reveal`, {
    method: "POST",
    body: JSON.stringify(
      currentPassword ? { currentPassword } : {},
    ),
  });
}

export function formToApiBody(
  values: RedeemFormValues,
  mode: "add" | "edit",
): Record<string, unknown> | { error: string } {
  const title = values.title.trim();
  const valueLabel = values.valueLabel.trim();
  const secret = values.codeSecret.trim().toUpperCase();
  if (!title) return { error: "Title is required." };
  if (!valueLabel) return { error: "Value is required." };
  if (mode === "add" && secret.length < 8) {
    return { error: "Code must be at least 8 characters." };
  }
  if (mode === "edit" && secret && secret.length < 8) {
    return { error: "New code must be at least 8 characters." };
  }
  if (values.stockLeft !== 0 && values.stockLeft !== 1) {
    return { error: "Stock must be 0 or 1." };
  }
  const coinRaw = values.coinCost.trim();
  const coinCost = coinRaw === "" ? null : Number(coinRaw);
  if (coinCost != null && (!Number.isFinite(coinCost) || coinCost < 0)) {
    return { error: "Coin cost must be a valid number." };
  }
  const body: Record<string, unknown> = {
    title,
    type: values.type,
    valueLabel,
    status: values.status,
    cadence: values.cadence,
    stockLeft: values.stockLeft,
    coinCost,
    expiresLabel: values.expiresLabel.trim() || "No expiry",
    tip: values.tip.trim() || "First Come, First Serve!",
    redeemUrl: values.redeemUrl.trim() || "https://play.google.com/redeem",
  };
  if (mode === "add" || secret) body.codeSecret = secret;
  return body;
}
