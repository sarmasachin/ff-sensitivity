import { apiFetch } from "@/lib/api";
import type { PromoRow } from "./promo-data";

// --- Start: Promos live wire (Sachin) ---
export async function fetchPromos(): Promise<PromoRow[]> {
  const data = await apiFetch<{ promos: PromoRow[] }>("/api/v1/admin/promos");
  return data.promos ?? [];
}

/** PUT body must match PromoDto — never send server-owned `updatedAt`. */
function toSavePayload(promos: PromoRow[]) {
  return promos.map((p) => ({
    id: p.id,
    title: p.title,
    subtitle: p.subtitle,
    imageLabel: p.imageLabel,
    deepLink: p.deepLink,
    placement: p.placement,
    sortOrder: p.sortOrder,
    enabled: p.enabled,
    startsAt: p.startsAt,
    endsAt: p.endsAt,
  }));
}

export async function createPromo(promo: PromoRow): Promise<PromoRow> {
  return apiFetch<PromoRow>("/api/v1/admin/promos", {
    method: "POST",
    body: JSON.stringify(toSavePayload([promo])[0]),
  });
}

export async function updatePromo(
  id: string,
  promo: PromoRow,
): Promise<PromoRow> {
  return apiFetch<PromoRow>(`/api/v1/admin/promos/${id}`, {
    method: "PUT",
    body: JSON.stringify(toSavePayload([{ ...promo, id }])[0]),
  });
}

export async function deletePromo(
  id: string,
): Promise<{ ok: true; id: string }> {
  return apiFetch<{ ok: true; id: string }>(`/api/v1/admin/promos/${id}`, {
    method: "DELETE",
  });
}

export async function reorderPromos(ids: string[]): Promise<PromoRow[]> {
  const data = await apiFetch<{ promos: PromoRow[] }>(
    "/api/v1/admin/promos/reorder",
    {
      method: "PATCH",
      body: JSON.stringify({ ids }),
    },
  );
  return data.promos ?? [];
}
// --- End: Promos live wire (Sachin) ---
