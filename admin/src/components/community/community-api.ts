import { apiFetch } from "@/lib/api";
import type { CommunityListRow, CommunityStatus } from "./community-data";

// --- Start: Community live wire (Sachin) ---
export type CommunityStatsDto = {
  pending: number;
  live: number;
  featured: number;
  flagged: number;
  hidden?: number;
};

export async function fetchCommunityPosts(opts?: {
  q?: string;
  status?: string;
}): Promise<CommunityListRow[]> {
  const params = new URLSearchParams();
  if (opts?.q?.trim()) params.set("q", opts.q.trim());
  if (opts?.status && opts.status !== "all") {
    params.set("status", opts.status.toUpperCase());
  }
  const qs = params.toString();
  const rows = await apiFetch<CommunityListRow[]>(
    `/api/v1/admin/community/posts${qs ? `?${qs}` : ""}`,
  );
  return rows.map((r) => ({
    ...r,
    status: r.status as CommunityStatus,
  }));
}

export async function fetchCommunityStats(): Promise<CommunityStatsDto> {
  return apiFetch<CommunityStatsDto>("/api/v1/admin/community/stats");
}

export async function patchCommunityStatus(
  id: string,
  status: CommunityStatus,
): Promise<CommunityListRow> {
  return apiFetch<CommunityListRow>(
    `/api/v1/admin/community/posts/${encodeURIComponent(id)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
}
// --- End: Community live wire (Sachin) ---
