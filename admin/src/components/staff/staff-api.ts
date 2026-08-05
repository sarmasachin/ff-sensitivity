import { apiFetch } from "@/lib/api";
import type { StaffListRow, StaffModuleId, StaffRole } from "./staff-data";

// --- Start: Staff admin live wire (Sachin) ---
export async function fetchStaff(): Promise<StaffListRow[]> {
  const data = await apiFetch<{ staff: StaffListRow[] }>(
    "/api/v1/admin/staff",
  );
  return data.staff ?? [];
}

export async function inviteStaffApi(body: {
  name: string;
  email: string;
  role: Exclude<StaffRole, "SUPER_ADMIN">;
  modules: StaffModuleId[];
  currentPassword?: string;
}): Promise<{ staff: StaffListRow; temporaryPassword: string }> {
  return apiFetch("/api/v1/admin/staff/invite", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function setStaffModulesApi(
  id: string,
  modules: StaffModuleId[],
): Promise<StaffListRow> {
  const data = await apiFetch<{ staff: StaffListRow }>(
    `/api/v1/admin/staff/${encodeURIComponent(id)}/modules`,
    { method: "PATCH", body: JSON.stringify({ modules }) },
  );
  return data.staff;
}

export async function disableStaffApi(id: string): Promise<StaffListRow> {
  const data = await apiFetch<{ staff: StaffListRow }>(
    `/api/v1/admin/staff/${encodeURIComponent(id)}/disable`,
    { method: "POST", body: "{}" },
  );
  return data.staff;
}

export async function enableStaffApi(id: string): Promise<StaffListRow> {
  const data = await apiFetch<{ staff: StaffListRow }>(
    `/api/v1/admin/staff/${encodeURIComponent(id)}/enable`,
    { method: "POST", body: "{}" },
  );
  return data.staff;
}

export async function resendInviteApi(
  id: string,
): Promise<{ staff: StaffListRow; temporaryPassword: string }> {
  return apiFetch(
    `/api/v1/admin/staff/${encodeURIComponent(id)}/resend-invite`,
    { method: "POST", body: "{}" },
  );
}
// --- End: Staff admin live wire (Sachin) ---
