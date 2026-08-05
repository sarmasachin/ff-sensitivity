import { apiFetch } from "@/lib/api";
import type { PromoRow } from "./promo-data";

// --- Start: Promos live wire (Sachin) ---
export async function fetchPromos(): Promise<PromoRow[]> {
  const data = await apiFetch<{ promos: PromoRow[] }>("/api/v1/admin/promos");
  return data.promos ?? [];
}

export async function savePromos(promos: PromoRow[]): Promise<PromoRow[]> {
  const data = await apiFetch<{ promos: PromoRow[] }>("/api/v1/admin/promos", {
    method: "PUT",
    body: JSON.stringify({ promos }),
  });
  return data.promos ?? [];
}
// --- End: Promos live wire (Sachin) ---
