import { apiFetch } from "@/lib/api";
import type { ClaimListRow, ClaimResult } from "./claims-data";

// --- Start: Claims live wire (Sachin) ---
export type ClaimsStatsDto = {
  copied: number;
  blocked: number;
  flagged: number;
  devices: number;
};

export async function fetchClaims(q?: string): Promise<ClaimListRow[]> {
  const params = new URLSearchParams();
  if (q?.trim()) params.set("q", q.trim());
  const qs = params.toString();
  const rows = await apiFetch<ClaimListRow[]>(
    `/api/v1/admin/claims${qs ? `?${qs}` : ""}`,
  );
  return rows.map((r) => ({
    ...r,
    result: r.result as ClaimResult,
  }));
}

export async function fetchClaimsStats(): Promise<ClaimsStatsDto> {
  return apiFetch<ClaimsStatsDto>("/api/v1/admin/claims/stats");
}

export async function flagClaimApi(
  id: string,
  flagged: boolean,
  note?: string,
): Promise<ClaimListRow> {
  const row = await apiFetch<ClaimListRow | null>(
    `/api/v1/admin/claims/${encodeURIComponent(id)}/flag`,
    {
      method: "PATCH",
      body: JSON.stringify({ flagged, note }),
    },
  );
  if (!row) {
    throw new Error("Claim update failed.");
  }
  return { ...row, result: row.result as ClaimResult };
}

export async function deleteClaimApi(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(
    `/api/v1/admin/claims/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}
// --- End: Claims live wire (Sachin) ---
