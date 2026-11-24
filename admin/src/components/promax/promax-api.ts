import { apiFetch } from "@/lib/api";
import type { ProMaxConfigBundle } from "./promax-data";

export async function fetchProMaxConfig(): Promise<ProMaxConfigBundle> {
  return apiFetch<ProMaxConfigBundle>("/api/v1/admin/promax");
}

export async function saveProMaxConfig(
  config: ProMaxConfigBundle,
): Promise<ProMaxConfigBundle> {
  return apiFetch<ProMaxConfigBundle>("/api/v1/admin/promax", {
    method: "PUT",
    body: JSON.stringify(config),
  });
}
