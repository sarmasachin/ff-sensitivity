import { apiFetch } from "@/lib/api";
import type {
  ProfileAccount,
  ProfileIdentity,
  ProfileSecurityForm,
} from "./profile-data";

// --- Start: Admin profile live wire (Sachin) ---
export type ProfileApiResponse = {
  id: string;
  email: string;
  role: string;
  allowedModules: string[];
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  displayName: string;
  jobTitle: string;
  deskLabel: string;
  notifyEmail: string;
  phone: string;
  timezoneLabel: string;
  digestDaily: boolean;
  digestSecurity: boolean;
};

export async function fetchMyProfile(): Promise<ProfileApiResponse> {
  return apiFetch<ProfileApiResponse>("/api/v1/auth/me");
}

export async function saveMyProfile(input: {
  identity: ProfileIdentity;
  account: ProfileAccount;
}): Promise<ProfileApiResponse> {
  return apiFetch<ProfileApiResponse>("/api/v1/auth/me", {
    method: "PATCH",
    body: JSON.stringify({
      displayName: input.identity.displayName.trim(),
      jobTitle: input.identity.jobTitle.trim(),
      deskLabel: input.identity.deskLabel.trim(),
      notifyEmail: input.account.notifyEmail.trim(),
      phone: input.account.phone.trim(),
      timezoneLabel: input.account.timezoneLabel.trim(),
      digestDaily: input.account.digestDaily,
      digestSecurity: input.account.digestSecurity,
    }),
  });
}

export async function changeMyPassword(
  security: ProfileSecurityForm,
): Promise<ProfileApiResponse> {
  return apiFetch<ProfileApiResponse>("/api/v1/auth/password", {
    method: "POST",
    body: JSON.stringify({
      currentPassword: security.currentPassword,
      newPassword: security.newPassword,
    }),
  });
}
// --- End: Admin profile live wire (Sachin) ---
