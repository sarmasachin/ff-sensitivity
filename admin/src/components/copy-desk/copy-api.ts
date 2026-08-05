import { apiFetch } from "@/lib/api";
import type { CopyRemoteConfig } from "./copy-data";

// --- Start: Copy CMS live wire (Sachin) ---
export async function fetchCopyConfig(): Promise<CopyRemoteConfig> {
  return apiFetch<CopyRemoteConfig>("/api/v1/admin/copy");
}

export async function saveCopyConfigApi(
  body: CopyRemoteConfig,
): Promise<CopyRemoteConfig> {
  return apiFetch<CopyRemoteConfig>("/api/v1/admin/copy", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}
// --- End: Copy CMS live wire (Sachin) ---
