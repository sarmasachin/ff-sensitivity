import { apiFetch } from "@/lib/api";
import type { UserListRow } from "./users-data";

// --- Start: Users admin live wire (Sachin) ---
export type UserScreenJourney = {
  days: number;
  since: string;
  summary: {
    visits: number;
    totalSeconds: number;
    uniqueScreens: number;
  };
  byScreen: Array<{ screen: string; visits: number; seconds: number }>;
  timeline: Array<{
    id: string;
    screen: string;
    durationMs: number;
    seconds: number;
    at: string;
  }>;
};

export type UserActivityItem = {
  id: string;
  name: "app_open" | "login" | "redeem_claim" | "scratch_roll" | "logout";
  detail: string | null;
  at: string;
};

export type UserActivityFeed = {
  days: number;
  since: string;
  summary: {
    total: number;
    counts: {
      app_open: number;
      login: number;
      redeem_claim: number;
      scratch_roll: number;
      logout: number;
    };
  };
  items: UserActivityItem[];
};

export async function fetchUsers(): Promise<UserListRow[]> {
  const data = await apiFetch<{ users: UserListRow[] }>(
    "/api/v1/admin/users",
  );
  return data.users ?? [];
}

export async function fetchUserScreenJourney(
  userId: string,
  days = 7,
): Promise<UserScreenJourney> {
  return apiFetch<UserScreenJourney>(
    `/api/v1/admin/users/${encodeURIComponent(userId)}/screen-journey?days=${days}`,
  );
}

export async function fetchUserActivityFeed(
  userId: string,
  days = 7,
): Promise<UserActivityFeed> {
  return apiFetch<UserActivityFeed>(
    `/api/v1/admin/users/${encodeURIComponent(userId)}/activity-feed?days=${days}`,
  );
}

export async function setUserStatusApi(
  userId: string,
  action: "restrict" | "suspend" | "restore",
  note?: string,
): Promise<UserListRow> {
  const data = await apiFetch<{ user: UserListRow }>(
    `/api/v1/admin/users/${encodeURIComponent(userId)}/status`,
    {
      method: "POST",
      body: JSON.stringify({ action, ...(note ? { note } : {}) }),
    },
  );
  return data.user;
}

export async function deleteUserDataApi(userId: string): Promise<UserListRow> {
  const data = await apiFetch<{ user: UserListRow }>(
    `/api/v1/admin/users/${encodeURIComponent(userId)}/delete`,
    { method: "POST" },
  );
  return data.user;
}
// --- End: Users admin live wire (Sachin) ---
