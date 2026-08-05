import { apiFetch } from "@/lib/api";
import type { PushAudience, PushCampaignRow } from "./push-data";

// --- Start: Push live wire (Sachin) ---
export type UpsertPushPayload = {
  id: string;
  title: string;
  body: string;
  deepLink: string;
  audience: PushAudience;
  topic: string;
  scheduleMode: "draft" | "later" | "now";
  scheduledAt?: string;
};

export async function fetchPushCampaigns(): Promise<PushCampaignRow[]> {
  const data = await apiFetch<{ campaigns: PushCampaignRow[] }>(
    "/api/v1/admin/push",
  );
  return data.campaigns ?? [];
}

export async function upsertPushCampaign(
  payload: UpsertPushPayload,
): Promise<PushCampaignRow> {
  const data = await apiFetch<{ campaign: PushCampaignRow }>(
    "/api/v1/admin/push",
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
  return data.campaign;
}

export async function sendPushCampaign(
  id: string,
): Promise<PushCampaignRow> {
  const data = await apiFetch<{ campaign: PushCampaignRow }>(
    `/api/v1/admin/push/${encodeURIComponent(id)}/send`,
    { method: "POST", body: "{}" },
  );
  return data.campaign;
}

export async function cancelPushCampaign(
  id: string,
): Promise<PushCampaignRow> {
  const data = await apiFetch<{ campaign: PushCampaignRow }>(
    `/api/v1/admin/push/${encodeURIComponent(id)}/cancel`,
    { method: "POST", body: "{}" },
  );
  return data.campaign;
}

export async function deletePushCampaign(id: string): Promise<void> {
  await apiFetch(`/api/v1/admin/push/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
// --- End: Push live wire (Sachin) ---
