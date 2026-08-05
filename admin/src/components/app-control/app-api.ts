import { apiFetch } from "@/lib/api";
import type { AppRemoteConfig } from "./app-control-data";

// --- Start: App remote config live wire (Sachin) ---
export async function fetchAppConfig(): Promise<AppRemoteConfig> {
  return apiFetch<AppRemoteConfig>("/api/v1/admin/app");
}

export async function saveAppConfig(
  config: AppRemoteConfig,
): Promise<AppRemoteConfig> {
  return apiFetch<AppRemoteConfig>("/api/v1/admin/app", {
    method: "PUT",
    body: JSON.stringify(config),
  });
}
// --- End: App remote config live wire (Sachin) ---
