import { apiFetch } from "@/lib/api";
import type { AuditListRow } from "./audit-data";

// --- Start: Audit admin live wire (Sachin) ---
export async function fetchAuditEvents(
  limit = 200,
): Promise<AuditListRow[]> {
  const data = await apiFetch<{ events: AuditListRow[] }>(
    `/api/v1/admin/audit?limit=${encodeURIComponent(String(limit))}`,
  );
  return data.events ?? [];
}
// --- End: Audit admin live wire (Sachin) ---
