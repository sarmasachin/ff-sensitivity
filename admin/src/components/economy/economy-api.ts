import { apiFetch } from "@/lib/api";
import type { EconomyConfig } from "./economy-data";

export function fetchEconomyConfig(): Promise<EconomyConfig> {
  return apiFetch<EconomyConfig>("/api/v1/admin/economy");
}

export function saveEconomyConfig(cfg: EconomyConfig): Promise<EconomyConfig> {
  return apiFetch<EconomyConfig>("/api/v1/admin/economy", {
    method: "PUT",
    body: JSON.stringify(cfg),
  });
}
