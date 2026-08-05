import { AppError } from '../common/errors/app-error';

// --- Start: Ops settings live wire (Sachin) ---
export const ALLOWED_LANDINGS = [
  '/dashboard',
  '/dash',
  '/redeem',
  '/claims',
  '/support',
  '/audit',
] as const;

export type OpsSettingsBundle = {
  preferences: {
    defaultLanding: string;
    compactTables: boolean;
    showInlineNotices: boolean;
    denseSidebar: boolean;
    timezoneLabel: string;
  };
  session: {
    idleTimeoutMinutes: number;
    absoluteSessionHours: number;
    rememberDeviceDays: number;
    logoutOnBrowserClose: boolean;
    singleSessionOnly: boolean;
  };
  security: {
    requireReauthForReveal: boolean;
    requireReauthForStaffInvite: boolean;
    requireReauthForWalletAdjust: boolean;
    allowViewerCsvExport: boolean;
    ipAllowlistNote: string;
    /** Keep AuditLog rows this many days (7–3650). */
    auditRetentionDays: number;
    /** Hourly job deletes rows older than retention. */
    auditAutoPurge: boolean;
    /** ISO stamp of last successful purge — server-managed. */
    lastAuditPurgeAt: string | null;
  };
};

export const DEFAULT_OPS_SETTINGS: OpsSettingsBundle = {
  preferences: {
    defaultLanding: '/dashboard',
    compactTables: false,
    showInlineNotices: true,
    denseSidebar: false,
    timezoneLabel: 'Asia/Kolkata (IST)',
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
      'No IP allowlist enforced yet — document office / VPN ranges here.',
    auditRetentionDays: 90,
    auditAutoPurge: true,
    lastAuditPurgeAt: null,
  },
};

export function sanitizeSettingsText(raw: string, max: number): string {
  return [...(raw ?? '')]
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      if (code < 0x20 || code === 0x7f) return false;
      if (code >= 0x200b && code <= 0x200f) return false;
      if (code === 0xfeff) return false;
      return true;
    })
    .join('')
    .trim()
    .slice(0, max);
}

export function assertSafeSettingsText(text: string, field: string) {
  const lower = text.toLowerCase();
  if (
    lower.includes('javascript:') ||
    lower.includes('data:text/html') ||
    /<script[\s>]/i.test(text)
  ) {
    throw new AppError(
      'SETTINGS_UNSAFE_TEXT',
      `${field} contains disallowed content.`,
      400,
    );
  }
}

export function assertLanding(raw: string): string {
  const landing = sanitizeSettingsText(raw, 64);
  if (!(ALLOWED_LANDINGS as readonly string[]).includes(landing)) {
    throw new AppError(
      'SETTINGS_BAD_LANDING',
      'Default landing is not in the allowlist.',
      400,
    );
  }
  return landing;
}

function assertIntInRange(
  raw: unknown,
  min: number,
  max: number,
  label: string,
): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new AppError(
      'SETTINGS_BAD_NUMBER',
      `${label} must be ${min}–${max}.`,
      400,
    );
  }
  return n;
}

export function normalizeSettingsPayload(raw: unknown): OpsSettingsBundle {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new AppError('SETTINGS_BAD_BODY', 'Invalid settings payload.', 400);
  }
  const body = raw as Record<string, unknown>;
  const prefs =
    body.preferences && typeof body.preferences === 'object'
      ? (body.preferences as Record<string, unknown>)
      : null;
  const session =
    body.session && typeof body.session === 'object'
      ? (body.session as Record<string, unknown>)
      : null;
  const security =
    body.security && typeof body.security === 'object'
      ? (body.security as Record<string, unknown>)
      : null;
  if (!prefs || !session || !security) {
    throw new AppError(
      'SETTINGS_BAD_BODY',
      'preferences, session, and security are required.',
      400,
    );
  }

  const timezoneLabel = sanitizeSettingsText(
    String(prefs.timezoneLabel ?? ''),
    64,
  );
  if (!timezoneLabel) {
    throw new AppError('SETTINGS_BAD_TZ', 'Timezone label is required.', 400);
  }
  assertSafeSettingsText(timezoneLabel, 'Timezone');

  const ipAllowlistNote = sanitizeSettingsText(
    String(security.ipAllowlistNote ?? ''),
    500,
  );
  if (!ipAllowlistNote) {
    throw new AppError(
      'SETTINGS_BAD_IP_NOTE',
      'IP policy note is required.',
      400,
    );
  }
  assertSafeSettingsText(ipAllowlistNote, 'IP allowlist note');

  const auditRetentionDays = assertIntInRange(
    security.auditRetentionDays,
    7,
    3650,
    'Audit retention',
  );

  // Client cannot forge last purge stamp — preserve existing via merge on save.
  const lastRaw = security.lastAuditPurgeAt;
  const lastAuditPurgeAt =
    typeof lastRaw === 'string' && lastRaw.trim()
      ? lastRaw.trim().slice(0, 40)
      : null;

  return {
    preferences: {
      defaultLanding: assertLanding(String(prefs.defaultLanding ?? '')),
      compactTables: Boolean(prefs.compactTables),
      showInlineNotices: Boolean(prefs.showInlineNotices),
      denseSidebar: Boolean(prefs.denseSidebar),
      timezoneLabel,
    },
    session: {
      idleTimeoutMinutes: assertIntInRange(
        session.idleTimeoutMinutes,
        5,
        480,
        'Idle timeout',
      ),
      absoluteSessionHours: assertIntInRange(
        session.absoluteSessionHours,
        1,
        168,
        'Absolute session',
      ),
      rememberDeviceDays: assertIntInRange(
        session.rememberDeviceDays,
        0,
        90,
        'Remember-device days',
      ),
      logoutOnBrowserClose: Boolean(session.logoutOnBrowserClose),
      singleSessionOnly: Boolean(session.singleSessionOnly),
    },
    security: {
      requireReauthForReveal: Boolean(security.requireReauthForReveal),
      requireReauthForStaffInvite: Boolean(
        security.requireReauthForStaffInvite,
      ),
      requireReauthForWalletAdjust: Boolean(
        security.requireReauthForWalletAdjust,
      ),
      allowViewerCsvExport: Boolean(security.allowViewerCsvExport),
      ipAllowlistNote,
      auditRetentionDays,
      auditAutoPurge: Boolean(security.auditAutoPurge),
      lastAuditPurgeAt,
    },
  };
}

function clampNum(
  raw: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function mergeSettingsJson(
  prefsRaw: unknown,
  sessionRaw: unknown,
  securityRaw: unknown,
): OpsSettingsBundle {
  const d = DEFAULT_OPS_SETTINGS;
  const prefs =
    prefsRaw && typeof prefsRaw === 'object' && !Array.isArray(prefsRaw)
      ? (prefsRaw as Record<string, unknown>)
      : {};
  const session =
    sessionRaw && typeof sessionRaw === 'object' && !Array.isArray(sessionRaw)
      ? (sessionRaw as Record<string, unknown>)
      : {};
  const security =
    securityRaw &&
    typeof securityRaw === 'object' &&
    !Array.isArray(securityRaw)
      ? (securityRaw as Record<string, unknown>)
      : {};
  const landing = String(prefs.defaultLanding ?? d.preferences.defaultLanding);
  return {
    preferences: {
      defaultLanding: (ALLOWED_LANDINGS as readonly string[]).includes(landing)
        ? landing
        : d.preferences.defaultLanding,
      compactTables:
        typeof prefs.compactTables === 'boolean'
          ? prefs.compactTables
          : d.preferences.compactTables,
      showInlineNotices:
        typeof prefs.showInlineNotices === 'boolean'
          ? prefs.showInlineNotices
          : d.preferences.showInlineNotices,
      denseSidebar:
        typeof prefs.denseSidebar === 'boolean'
          ? prefs.denseSidebar
          : d.preferences.denseSidebar,
      timezoneLabel: String(
        prefs.timezoneLabel ?? d.preferences.timezoneLabel,
      ).slice(0, 64),
    },
    session: {
      idleTimeoutMinutes: clampNum(
        session.idleTimeoutMinutes,
        5,
        480,
        d.session.idleTimeoutMinutes,
      ),
      absoluteSessionHours: clampNum(
        session.absoluteSessionHours,
        1,
        168,
        d.session.absoluteSessionHours,
      ),
      rememberDeviceDays: clampNum(
        session.rememberDeviceDays,
        0,
        90,
        d.session.rememberDeviceDays,
      ),
      logoutOnBrowserClose:
        typeof session.logoutOnBrowserClose === 'boolean'
          ? session.logoutOnBrowserClose
          : d.session.logoutOnBrowserClose,
      singleSessionOnly:
        typeof session.singleSessionOnly === 'boolean'
          ? session.singleSessionOnly
          : d.session.singleSessionOnly,
    },
    security: {
      requireReauthForReveal:
        typeof security.requireReauthForReveal === 'boolean'
          ? security.requireReauthForReveal
          : d.security.requireReauthForReveal,
      requireReauthForStaffInvite:
        typeof security.requireReauthForStaffInvite === 'boolean'
          ? security.requireReauthForStaffInvite
          : d.security.requireReauthForStaffInvite,
      requireReauthForWalletAdjust:
        typeof security.requireReauthForWalletAdjust === 'boolean'
          ? security.requireReauthForWalletAdjust
          : d.security.requireReauthForWalletAdjust,
      allowViewerCsvExport:
        typeof security.allowViewerCsvExport === 'boolean'
          ? security.allowViewerCsvExport
          : d.security.allowViewerCsvExport,
      ipAllowlistNote: String(
        security.ipAllowlistNote ?? d.security.ipAllowlistNote,
      ).slice(0, 500),
      auditRetentionDays: clampNum(
        security.auditRetentionDays,
        7,
        3650,
        d.security.auditRetentionDays,
      ),
      auditAutoPurge:
        typeof security.auditAutoPurge === 'boolean'
          ? security.auditAutoPurge
          : d.security.auditAutoPurge,
      lastAuditPurgeAt:
        typeof security.lastAuditPurgeAt === 'string' &&
        security.lastAuditPurgeAt.trim()
          ? security.lastAuditPurgeAt.trim().slice(0, 40)
          : null,
    },
  };
}
// --- End: Ops settings live wire (Sachin) ---
