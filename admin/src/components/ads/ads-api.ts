import { apiFetch } from "@/lib/api";
import type { AdsConfigBundle } from "./ads-data";

export async function fetchAdsConfig(): Promise<AdsConfigBundle> {
  return apiFetch<AdsConfigBundle>("/api/v1/admin/ads");
}

export async function saveAdsConfig(
  config: AdsConfigBundle,
): Promise<AdsConfigBundle> {
  return apiFetch<AdsConfigBundle>("/api/v1/admin/ads", {
    method: "PUT",
    body: JSON.stringify(config),
  });
}
