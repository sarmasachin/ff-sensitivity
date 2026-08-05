import { apiFetch } from "@/lib/api";
import type { SupportThreadRow } from "./support-data";

// --- Start: Support live wire (Sachin) ---
export type SupportStatsPayload = {
  total: number;
  open: number;
  unread: number;
  replied: number;
  closed: number;
};

export async function fetchSupportThreads(opts?: {
  q?: string;
  status?: string;
}): Promise<SupportThreadRow[]> {
  const params = new URLSearchParams();
  if (opts?.q?.trim()) params.set("q", opts.q.trim());
  if (opts?.status?.trim()) params.set("status", opts.status.trim());
  const qs = params.toString();
  const path = qs
    ? `/api/v1/admin/support?${qs}`
    : "/api/v1/admin/support";
  const data = await apiFetch<{ threads: SupportThreadRow[] }>(path);
  return data.threads ?? [];
}

export async function fetchSupportStats(): Promise<SupportStatsPayload> {
  return apiFetch<SupportStatsPayload>("/api/v1/admin/support/stats");
}

export async function replySupportThread(
  id: string,
  message: string,
): Promise<SupportThreadRow> {
  return apiFetch<SupportThreadRow>(`/api/v1/admin/support/${id}/reply`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export async function closeSupportThread(
  id: string,
): Promise<SupportThreadRow> {
  return apiFetch<SupportThreadRow>(`/api/v1/admin/support/${id}/close`, {
    method: "PATCH",
  });
}

export async function markSupportRead(id: string): Promise<SupportThreadRow> {
  return apiFetch<SupportThreadRow>(`/api/v1/admin/support/${id}/read`, {
    method: "PATCH",
  });
}
// --- End: Support live wire (Sachin) ---
