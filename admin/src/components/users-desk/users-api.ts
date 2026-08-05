import { apiFetch } from "@/lib/api";
import type { UserListRow } from "./users-data";

// --- Start: Users admin live wire (Sachin) ---
export async function fetchUsers(): Promise<UserListRow[]> {
  const data = await apiFetch<{ users: UserListRow[] }>(
    "/api/v1/admin/users",
  );
  return data.users ?? [];
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
// --- End: Users admin live wire (Sachin) ---
