export type SettingsTabId = "preferences" | "session" | "security";

export type SettingsPreferences = {
  defaultLanding: string;
  compactTables: boolean;
  showInlineNotices: boolean;
  denseSidebar: boolean;
  timezoneLabel: string;
};

export type SettingsSession = {
  idleTimeoutMinutes: number;
  absoluteSessionHours: number;
  rememberDeviceDays: number;
  logoutOnBrowserClose: boolean;
  singleSessionOnly: boolean;
};

export type SettingsSecurity = {
  requireReauthForReveal: boolean;
  requireReauthForStaffInvite: boolean;
  requireReauthForWalletAdjust: boolean;
  allowViewerCsvExport: boolean;
  ipAllowlistNote: string;
  auditRetentionDays: number;
  auditAutoPurge: boolean;
  lastAuditPurgeAt: string | null;
};

export type SettingsConfig = {
  preferences: SettingsPreferences;
  session: SettingsSession;
  security: SettingsSecurity;
};

export const SETTINGS_LANDING_OPTIONS = [
  { value: "/dashboard", label: "Overview" },
  { value: "/dash", label: "Dashboard" },
  { value: "/redeem", label: "Redeem" },
  { value: "/claims", label: "Claims" },
  { value: "/support", label: "Support" },
  { value: "/audit", label: "Audit" },
] as const;

export const SETTINGS_DEFAULT_CONFIG: SettingsConfig = {
  preferences: {
    defaultLanding: "/dashboard",
    compactTables: false,
    showInlineNotices: true,
    denseSidebar: false,
    timezoneLabel: "Asia/Kolkata (IST)",
  },
  session: {
    idleTimeoutMinutes: 45,
    absoluteSessionHours: 12,
    rememberDeviceDays: 14,
    logoutOnBrowserClose: false,
    singleSessionOnly: true,
  },
  security: {
    requireReauthForReveal: false,
    requireReauthForStaffInvite: false,
    requireReauthForWalletAdjust: false,
    allowViewerCsvExport: false,
    ipAllowlistNote:
      "No IP allowlist enforced yet — document office / VPN ranges here.",
    auditRetentionDays: 90,
    auditAutoPurge: true,
    lastAuditPurgeAt: null,
  },
};

export const SETTINGS_CAPABILITIES = [
  {
    title: "Console prefs",
    body: "Default landing, table density, and notice behavior for this ops desk only — not Android.",
  },
  {
    title: "Session policy",
    body: "Idle timeout, absolute session length, remember-device window, and single-session lock.",
  },
  {
    title: "Step-up reauth",
    body: "Require password again before code reveal, staff invite, or wallet grant/revoke.",
  },
  {
    title: "Viewer exports",
    body: "Optionally block CSV exports for Viewer role even when a module is visible.",
  },
  {
    title: "Audit retention",
    body: "Keep AuditLog for N days (7–3650). Auto-purge hourly; Run now deletes only older rows.",
  },
  {
    title: "Live Nest wire",
    body: "Persisted in OpsSettings. Step-up + retention enforced server-side.",
  },
] as const;

export function computeSettingsStats(config: SettingsConfig) {
  const reauthGates = [
    config.security.requireReauthForReveal,
    config.security.requireReauthForStaffInvite,
    config.security.requireReauthForWalletAdjust,
  ].filter(Boolean).length;
  return {
    idleMinutes: config.session.idleTimeoutMinutes,
    sessionHours: config.session.absoluteSessionHours,
    reauthGates,
    singleSession: config.session.singleSessionOnly,
    landing: config.preferences.defaultLanding,
    auditDays: config.security.auditRetentionDays,
  };
}

export function validateSettingsPreferences(
  prefs: SettingsPreferences,
): string | null {
  if (!prefs.defaultLanding.trim()) {
    return "Default landing route is required.";
  }
  if (!prefs.timezoneLabel.trim()) {
    return "Timezone label is required.";
  }
  return null;
}

export function validateSettingsSession(
  session: SettingsSession,
): string | null {
  if (
    !Number.isFinite(session.idleTimeoutMinutes) ||
    session.idleTimeoutMinutes < 5
  ) {
    return "Idle timeout must be ≥ 5 minutes.";
  }
  if (
    !Number.isFinite(session.absoluteSessionHours) ||
    session.absoluteSessionHours < 1
  ) {
    return "Absolute session must be ≥ 1 hour.";
  }
  if (
    !Number.isFinite(session.rememberDeviceDays) ||
    session.rememberDeviceDays < 0
  ) {
    return "Remember-device days must be ≥ 0.";
  }
  return null;
}

export function validateSettingsSecurity(
  security: SettingsSecurity,
): string | null {
  if (!security.ipAllowlistNote.trim()) {
    return "IP policy note is required (even if unused).";
  }
  if (
    !Number.isFinite(security.auditRetentionDays) ||
    security.auditRetentionDays < 7 ||
    security.auditRetentionDays > 3650
  ) {
    return "Audit retention must be 7–3650 days.";
  }
  return null;
}
