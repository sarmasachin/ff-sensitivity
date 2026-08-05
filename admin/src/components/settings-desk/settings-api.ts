import { apiFetch } from "@/lib/api";
import type { SettingsConfig } from "./settings-data";

// --- Start: Ops settings live wire (Sachin) ---
export async function fetchOpsSettings(): Promise<SettingsConfig> {
  return apiFetch<SettingsConfig>("/api/v1/admin/settings");
}

export async function saveOpsSettingsApi(
  body: SettingsConfig,
): Promise<SettingsConfig> {
  return apiFetch<SettingsConfig>("/api/v1/admin/settings", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function purgeAuditLogsApi(): Promise<{
  deleted: number;
  skipped: boolean;
  retentionDays: number;
  lastAuditPurgeAt: string | null;
}> {
  return apiFetch("/api/v1/admin/settings/audit-purge", {
    method: "POST",
    body: "{}",
  });
}

/** Viewer CSV blocked unless Settings.security.allowViewerCsvExport is on. */
export function canExportCsv(allowViewerCsvExport: boolean): boolean {
  if (typeof window === "undefined") return false;
  const raw =
    sessionStorage.getItem("ffops_admin") ?? localStorage.getItem("ffops_admin");
  if (!raw) return false;
  try {
    const admin = JSON.parse(raw) as { role?: string };
    if (admin.role !== "VIEWER") return true;
    return allowViewerCsvExport === true;
  } catch {
    return false;
  }
}
// --- End: Ops settings live wire (Sachin) ---
