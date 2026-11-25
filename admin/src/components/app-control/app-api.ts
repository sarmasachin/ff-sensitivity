import { apiFetch } from "@/lib/api";
import type { AppRemoteConfig } from "./app-control-data";

/** PUT /admin/app forbids extra keys (ads/promax live on their own desks). */
function appConfigWriteBody(config: AppRemoteConfig) {
  return {
    status: config.status,
    features: config.features,
    navigation: config.navigation,
    links: config.links,
  };
}

function pickAppRemoteConfig(raw: unknown): AppRemoteConfig {
  const r = (raw ?? {}) as Partial<AppRemoteConfig> & Record<string, unknown>;
  return {
    status: r.status as AppRemoteConfig["status"],
    features: r.features as AppRemoteConfig["features"],
    navigation: r.navigation as AppRemoteConfig["navigation"],
    links: r.links as AppRemoteConfig["links"],
  };
}

// --- Start: App remote config live wire (Sachin) ---
export async function fetchAppConfig(): Promise<AppRemoteConfig> {
  const raw = await apiFetch<unknown>("/api/v1/admin/app");
  return pickAppRemoteConfig(raw);
}

export async function saveAppConfig(
  config: AppRemoteConfig,
): Promise<AppRemoteConfig> {
  const raw = await apiFetch<unknown>("/api/v1/admin/app", {
    method: "PUT",
    body: JSON.stringify(appConfigWriteBody(config)),
  });
  return pickAppRemoteConfig(raw);
}
// --- End: App remote config live wire (Sachin) ---
