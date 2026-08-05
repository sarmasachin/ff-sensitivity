import type { ProfileApiResponse } from "./profile-api";

export type ProfileTabId = "identity" | "account" | "security" | "access";

export type ProfileIdentity = {
  displayName: string;
  jobTitle: string;
  deskLabel: string;
};

export type ProfileAccount = {
  notifyEmail: string;
  phone: string;
  timezoneLabel: string;
  digestDaily: boolean;
  digestSecurity: boolean;
};

export type ProfileSecurityForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type ProfileSessionInfo = {
  email: string;
  role: string;
  adminId: string;
  allowedModules: string[];
  mustChangePassword: boolean;
  storageScope: "session" | "local" | "unknown";
  lastLoginAt: string | null;
};

export type ProfileDraft = {
  identity: ProfileIdentity;
  account: ProfileAccount;
  security: ProfileSecurityForm;
};

export type StoredAdminBlob = {
  id?: string;
  email?: string;
  role?: string;
  allowedModules?: string[];
  mustChangePassword?: boolean;
  displayName?: string;
};

export const PROFILE_ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  SUB_ADMIN: "Sub-Admin",
  VIEWER: "Viewer",
};

export const PROFILE_CAPABILITIES = [
  {
    title: "Operator identity",
    body: "Display name, job title, and desk label — saved on your Admin row.",
  },
  {
    title: "Contact channel",
    body: "Notify email and optional phone for digests. Sign-in email stays read-only.",
  },
  {
    title: "Password change",
    body: "Requires current password. Nest hashes with bcrypt and clears must-change.",
  },
  {
    title: "Access snapshot",
    body: "Role and module ACL from the signed-in seat — edit seats on Staff.",
  },
  {
    title: "Session scope",
    body: "Shows whether this login is sessionStorage or remembered on device.",
  },
  {
    title: "Self-only wire",
    body: "PATCH /auth/me + POST /auth/password — never mutates another admin.",
  },
] as const;

export function emptySecurityForm(): ProfileSecurityForm {
  return {
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  };
}

export function draftFromProfile(
  profile: ProfileApiResponse,
): Omit<ProfileDraft, "security"> & { security: ProfileSecurityForm } {
  return {
    identity: {
      displayName: profile.displayName,
      jobTitle: profile.jobTitle,
      deskLabel: profile.deskLabel,
    },
    account: {
      notifyEmail: profile.notifyEmail,
      phone: profile.phone ?? "",
      timezoneLabel: profile.timezoneLabel,
      digestDaily: profile.digestDaily,
      digestSecurity: profile.digestSecurity,
    },
    security: emptySecurityForm(),
  };
}

export function sessionFromProfile(
  profile: ProfileApiResponse,
  storageScope: ProfileSessionInfo["storageScope"],
): ProfileSessionInfo {
  return {
    email: profile.email,
    role: profile.role,
    adminId: profile.id,
    allowedModules: Array.isArray(profile.allowedModules)
      ? profile.allowedModules.filter((m) => typeof m === "string")
      : [],
    mustChangePassword: Boolean(profile.mustChangePassword),
    storageScope,
    lastLoginAt: profile.lastLoginAt,
  };
}

export function defaultDraftFromSession(
  session: ProfileSessionInfo,
): ProfileDraft {
  const local = session.email.split("@")[0] ?? "Operator";
  const pretty = local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
  return {
    identity: {
      displayName: pretty || "Operator",
      jobTitle: PROFILE_ROLE_LABEL[session.role] ?? "Staff",
      deskLabel: "FF Sensitivity Ops",
    },
    account: {
      notifyEmail: session.email,
      phone: "",
      timezoneLabel: "Asia/Kolkata (IST)",
      digestDaily: false,
      digestSecurity: true,
    },
    security: emptySecurityForm(),
  };
}

export function readStorageScope(): ProfileSessionInfo["storageScope"] {
  if (typeof window === "undefined") return "unknown";
  if (sessionStorage.getItem("ffops_admin")) return "session";
  if (localStorage.getItem("ffops_admin")) return "local";
  return "unknown";
}

export function readProfileSession(): ProfileSessionInfo {
  if (typeof window === "undefined") {
    return {
      email: "",
      role: "",
      adminId: "",
      allowedModules: [],
      mustChangePassword: false,
      storageScope: "unknown",
      lastLoginAt: null,
    };
  }

  const sessionRaw = sessionStorage.getItem("ffops_admin");
  const localRaw = localStorage.getItem("ffops_admin");
  const raw = sessionRaw ?? localRaw;
  let blob: StoredAdminBlob = {};
  if (raw) {
    try {
      blob = JSON.parse(raw) as StoredAdminBlob;
    } catch {
      blob = {};
    }
  }

  const modules = Array.isArray(blob.allowedModules)
    ? blob.allowedModules.filter((m) => typeof m === "string")
    : [];

  return {
    email: (blob.email ?? "").trim(),
    role: (blob.role ?? "").trim(),
    adminId: (blob.id ?? "").trim(),
    allowedModules: modules,
    mustChangePassword: Boolean(blob.mustChangePassword),
    storageScope: sessionRaw ? "session" : localRaw ? "local" : "unknown",
    lastLoginAt: null,
  };
}

/** Keep ffops_admin in sync after profile / password saves. */
export function syncStoredAdminBlob(profile: ProfileApiResponse) {
  if (typeof window === "undefined") return;
  const scope = readStorageScope();
  const store =
    scope === "local"
      ? localStorage
      : scope === "session"
        ? sessionStorage
        : sessionStorage.getItem("ffops_access_token")
          ? sessionStorage
          : localStorage;
  const prevRaw = store.getItem("ffops_admin");
  let prev: StoredAdminBlob = {};
  if (prevRaw) {
    try {
      prev = JSON.parse(prevRaw) as StoredAdminBlob;
    } catch {
      prev = {};
    }
  }
  const next: StoredAdminBlob = {
    ...prev,
    id: profile.id,
    email: profile.email,
    role: profile.role,
    allowedModules: profile.allowedModules,
    mustChangePassword: profile.mustChangePassword,
    displayName: profile.displayName,
  };
  store.setItem("ffops_admin", JSON.stringify(next));
}

export function roleLabel(role: string): string {
  return PROFILE_ROLE_LABEL[role] ?? (role.replaceAll("_", " ") || "—");
}

export function computeProfileStats(
  session: ProfileSessionInfo,
  draft: ProfileDraft,
) {
  const modules =
    session.allowedModules.length > 0
      ? session.allowedModules.length
      : session.role === "SUPER_ADMIN" || session.role === "ADMIN"
        ? "All"
        : "—";
  return {
    role: roleLabel(session.role),
    modules,
    storage:
      session.storageScope === "session"
        ? "Browser session"
        : session.storageScope === "local"
          ? "Remembered"
          : "—",
    mustChange: session.mustChangePassword,
    displayName: draft.identity.displayName.trim() || "—",
  };
}

export function validateProfileIdentity(
  identity: ProfileIdentity,
): string | null {
  if (!identity.displayName.trim()) {
    return "Display name is required.";
  }
  if (identity.displayName.trim().length < 2) {
    return "Display name must be at least 2 characters.";
  }
  if (!identity.jobTitle.trim()) {
    return "Job title is required.";
  }
  if (!identity.deskLabel.trim()) {
    return "Desk label is required.";
  }
  return null;
}

export function validateProfileAccount(account: ProfileAccount): string | null {
  const email = account.notifyEmail.trim();
  if (!email) {
    return "Notify email is required.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Notify email looks invalid.";
  }
  if (!account.timezoneLabel.trim()) {
    return "Timezone label is required.";
  }
  const phone = account.phone.trim();
  if (phone && !/^[+\d][\d\s()-]{6,}$/.test(phone)) {
    return "Phone format looks invalid.";
  }
  return null;
}

export function validateProfileSecurity(
  security: ProfileSecurityForm,
): string | null {
  const touching =
    security.currentPassword ||
    security.newPassword ||
    security.confirmPassword;
  if (!touching) return null;
  if (!security.currentPassword) {
    return "Enter your current password to change it.";
  }
  if (security.newPassword.length < 8) {
    return "New password must be at least 8 characters.";
  }
  if (security.newPassword === security.currentPassword) {
    return "New password must differ from the current one.";
  }
  if (security.newPassword !== security.confirmPassword) {
    return "New password and confirmation do not match.";
  }
  if (/\s/.test(security.newPassword)) {
    return "Password must not contain spaces.";
  }
  return null;
}
