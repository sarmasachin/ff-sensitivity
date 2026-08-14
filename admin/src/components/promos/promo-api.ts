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

export async function savePromos(promos: PromoRow[]): Promise<PromoRow[]> {
  const data = await apiFetch<{ promos: PromoRow[] }>("/api/v1/admin/promos", {
    method: "PUT",
    body: JSON.stringify({ promos: toSavePayload(promos) }),
  });
  return data.promos ?? [];
}
// --- End: Promos live wire (Sachin) ---
