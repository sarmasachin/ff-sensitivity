import { apiFetch } from "@/lib/api";
import type {
  RedeemCadenceRow,
  RedeemFormValues,
  RedeemListRow,
  RedeemTypeRow,
} from "./redeem-data";
import { SAFE_SCRATCH_TIP } from "./redeem-data";

export async function fetchRedeemCodes(): Promise<{
  codes: RedeemListRow[];
  types: RedeemTypeRow[];
  cadences: RedeemCadenceRow[];
}> {
  const data = await apiFetch<{
    codes: RedeemListRow[];
    types?: RedeemTypeRow[];
    cadences?: RedeemCadenceRow[];
  }>("/api/v1/admin/redeem");
  return {
    codes: (data.codes ?? []).map((row) => ({
      ...row,
      mode: row.mode ?? "SINGLE",
      poolLeft: row.poolLeft ?? null,
      coinRewardMin: row.coinRewardMin ?? null,
      coinRewardMax: row.coinRewardMax ?? null,
      startsAt: row.startsAt ?? null,
      endsAt: row.endsAt ?? null,
      windowMinutes: row.windowMinutes ?? 30,
      codesPerWindow: row.codesPerWindow ?? 1,
    })),
    types: data.types ?? [],
    cadences: data.cadences ?? [],
  };
}

export async function createRedeemType(body: {
  id: string;
  label: string;
}): Promise<RedeemTypeRow> {
  return apiFetch<RedeemTypeRow>("/api/v1/admin/redeem/types", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function createRedeemCadence(body: {
  id: string;
  label: string;
  claimLimit?: number;
  windowHours?: number;
}): Promise<RedeemCadenceRow> {
  return apiFetch<RedeemCadenceRow>("/api/v1/admin/redeem/cadences", {
    method: "POST",
    body: JSON.stringify(body),
  });
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
): Promise<{
  id: string;
  title: string;
  code: string | null;
  unusedPreview?: { id: string; codeMasked: string; code: string }[];
}> {
  return apiFetch(`/api/v1/admin/redeem/${encodeURIComponent(id)}/reveal`, {
    method: "POST",
    body: JSON.stringify(currentPassword ? { currentPassword } : {}),
  });
}

function parsePoolText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function localToIso(local: string): string | undefined {
  const t = local.trim();
  if (!t) return undefined;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export function formToApiBody(
  values: RedeemFormValues,
  mode: "add" | "edit",
): Record<string, unknown> | { error: string } {
  const title = values.title.trim();
  const valueLabel = values.valueLabel.trim();
  if (!title) return { error: "Title is required." };
  if (!valueLabel) return { error: "Value is required." };

  if (values.cardMode === "SCRATCH_REWARD") {
    const pool = parsePoolText(values.codePoolText);
    if (mode === "add" && pool.length < 1) {
      return { error: "Paste at least one code in the pool (one per line)." };
    }
    const min = Number(values.coinRewardMin);
    const max = Number(values.coinRewardMax);
    if (!Number.isFinite(min) || min < 0) {
      return { error: "Min coins must be 0 or higher." };
    }
    if (!Number.isFinite(max) || max < min) {
      return { error: "Max coins must be >= min coins." };
    }
    const windowMinutes = Number(values.windowMinutes || 30);
    const codesPerWindow = Number(values.codesPerWindow || 1);
    if (!Number.isFinite(windowMinutes) || windowMinutes < 5) {
      return { error: "Window must be at least 5 minutes." };
    }
    if (!Number.isFinite(codesPerWindow) || codesPerWindow < 1) {
      return { error: "Codes per window must be at least 1." };
    }
    const body: Record<string, unknown> = {
      mode: "SCRATCH_REWARD",
      title,
      type: values.type,
      valueLabel,
      status: values.status,
      cadence: values.cadence,
      coinRewardMin: Math.floor(min),
      coinRewardMax: Math.floor(max),
      windowMinutes: Math.floor(windowMinutes),
      codesPerWindow: Math.floor(codesPerWindow),
      expiresLabel: values.expiresLabel.trim() || "Schedule",
      tip: values.tip.trim() || SAFE_SCRATCH_TIP,
      redeemUrl: values.redeemUrl.trim() || "https://play.google.com/redeem",
    };
    const startsAt = localToIso(values.startsAtLocal);
    const endsAt = localToIso(values.endsAtLocal);
    if (startsAt) body.startsAt = startsAt;
    if (mode === "edit") {
      body.startsAt = startsAt ?? null;
      body.endsAt = endsAt ?? null;
    } else if (endsAt) {
      body.endsAt = endsAt;
    }
    if (pool.length) body.codePool = pool;
    return body;
  }

  const secret = values.codeSecret.trim().toUpperCase();
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
    mode: "SINGLE",
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
