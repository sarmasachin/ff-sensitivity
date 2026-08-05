"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_OPS_SETTINGS = exports.ALLOWED_LANDINGS = void 0;
exports.sanitizeSettingsText = sanitizeSettingsText;
exports.assertSafeSettingsText = assertSafeSettingsText;
exports.assertLanding = assertLanding;
exports.normalizeSettingsPayload = normalizeSettingsPayload;
exports.mergeSettingsJson = mergeSettingsJson;
const app_error_1 = require("../common/errors/app-error");
exports.ALLOWED_LANDINGS = [
    '/dashboard',
    '/dash',
    '/redeem',
    '/claims',
    '/support',
    '/audit',
];
exports.DEFAULT_OPS_SETTINGS = {
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
        ipAllowlistNote: 'No IP allowlist enforced yet — document office / VPN ranges here.',
        auditRetentionDays: 90,
        auditAutoPurge: true,
        lastAuditPurgeAt: null,
    },
};
function sanitizeSettingsText(raw, max) {
    return [...(raw ?? '')]
        .filter((ch) => {
        const code = ch.codePointAt(0) ?? 0;
        if (code < 0x20 || code === 0x7f)
            return false;
        if (code >= 0x200b && code <= 0x200f)
            return false;
        if (code === 0xfeff)
            return false;
        return true;
    })
        .join('')
        .trim()
        .slice(0, max);
}
function assertSafeSettingsText(text, field) {
    const lower = text.toLowerCase();
    if (lower.includes('javascript:') ||
        lower.includes('data:text/html') ||
        /<script[\s>]/i.test(text)) {
        throw new app_error_1.AppError('SETTINGS_UNSAFE_TEXT', `${field} contains disallowed content.`, 400);
    }
}
function assertLanding(raw) {
    const landing = sanitizeSettingsText(raw, 64);
    if (!exports.ALLOWED_LANDINGS.includes(landing)) {
        throw new app_error_1.AppError('SETTINGS_BAD_LANDING', 'Default landing is not in the allowlist.', 400);
    }
    return landing;
}
function assertIntInRange(raw, min, max, label) {
    const n = Math.floor(Number(raw));
    if (!Number.isFinite(n) || n < min || n > max) {
        throw new app_error_1.AppError('SETTINGS_BAD_NUMBER', `${label} must be ${min}–${max}.`, 400);
    }
    return n;
}
function normalizeSettingsPayload(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        throw new app_error_1.AppError('SETTINGS_BAD_BODY', 'Invalid settings payload.', 400);
    }
    const body = raw;
    const prefs = body.preferences && typeof body.preferences === 'object'
        ? body.preferences
        : null;
    const session = body.session && typeof body.session === 'object'
        ? body.session
        : null;
    const security = body.security && typeof body.security === 'object'
        ? body.security
        : null;
    if (!prefs || !session || !security) {
        throw new app_error_1.AppError('SETTINGS_BAD_BODY', 'preferences, session, and security are required.', 400);
    }
    const timezoneLabel = sanitizeSettingsText(String(prefs.timezoneLabel ?? ''), 64);
    if (!timezoneLabel) {
        throw new app_error_1.AppError('SETTINGS_BAD_TZ', 'Timezone label is required.', 400);
    }
    assertSafeSettingsText(timezoneLabel, 'Timezone');
    const ipAllowlistNote = sanitizeSettingsText(String(security.ipAllowlistNote ?? ''), 500);
    if (!ipAllowlistNote) {
        throw new app_error_1.AppError('SETTINGS_BAD_IP_NOTE', 'IP policy note is required.', 400);
    }
    assertSafeSettingsText(ipAllowlistNote, 'IP allowlist note');
    const auditRetentionDays = assertIntInRange(security.auditRetentionDays, 7, 3650, 'Audit retention');
    const lastRaw = security.lastAuditPurgeAt;
    const lastAuditPurgeAt = typeof lastRaw === 'string' && lastRaw.trim()
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
            idleTimeoutMinutes: assertIntInRange(session.idleTimeoutMinutes, 5, 480, 'Idle timeout'),
            absoluteSessionHours: assertIntInRange(session.absoluteSessionHours, 1, 168, 'Absolute session'),
            rememberDeviceDays: assertIntInRange(session.rememberDeviceDays, 0, 90, 'Remember-device days'),
            logoutOnBrowserClose: Boolean(session.logoutOnBrowserClose),
            singleSessionOnly: Boolean(session.singleSessionOnly),
        },
        security: {
            requireReauthForReveal: Boolean(security.requireReauthForReveal),
            requireReauthForStaffInvite: Boolean(security.requireReauthForStaffInvite),
            requireReauthForWalletAdjust: Boolean(security.requireReauthForWalletAdjust),
            allowViewerCsvExport: Boolean(security.allowViewerCsvExport),
            ipAllowlistNote,
            auditRetentionDays,
            auditAutoPurge: Boolean(security.auditAutoPurge),
            lastAuditPurgeAt,
        },
    };
}
function clampNum(raw, min, max, fallback) {
    const n = Math.floor(Number(raw));
    if (!Number.isFinite(n))
        return fallback;
    return Math.min(max, Math.max(min, n));
}
function mergeSettingsJson(prefsRaw, sessionRaw, securityRaw) {
    const d = exports.DEFAULT_OPS_SETTINGS;
    const prefs = prefsRaw && typeof prefsRaw === 'object' && !Array.isArray(prefsRaw)
        ? prefsRaw
        : {};
    const session = sessionRaw && typeof sessionRaw === 'object' && !Array.isArray(sessionRaw)
        ? sessionRaw
        : {};
    const security = securityRaw &&
        typeof securityRaw === 'object' &&
        !Array.isArray(securityRaw)
        ? securityRaw
        : {};
    const landing = String(prefs.defaultLanding ?? d.preferences.defaultLanding);
    return {
        preferences: {
            defaultLanding: exports.ALLOWED_LANDINGS.includes(landing)
                ? landing
                : d.preferences.defaultLanding,
            compactTables: typeof prefs.compactTables === 'boolean'
                ? prefs.compactTables
                : d.preferences.compactTables,
            showInlineNotices: typeof prefs.showInlineNotices === 'boolean'
                ? prefs.showInlineNotices
                : d.preferences.showInlineNotices,
            denseSidebar: typeof prefs.denseSidebar === 'boolean'
                ? prefs.denseSidebar
                : d.preferences.denseSidebar,
            timezoneLabel: String(prefs.timezoneLabel ?? d.preferences.timezoneLabel).slice(0, 64),
        },
        session: {
            idleTimeoutMinutes: clampNum(session.idleTimeoutMinutes, 5, 480, d.session.idleTimeoutMinutes),
            absoluteSessionHours: clampNum(session.absoluteSessionHours, 1, 168, d.session.absoluteSessionHours),
            rememberDeviceDays: clampNum(session.rememberDeviceDays, 0, 90, d.session.rememberDeviceDays),
            logoutOnBrowserClose: typeof session.logoutOnBrowserClose === 'boolean'
                ? session.logoutOnBrowserClose
                : d.session.logoutOnBrowserClose,
            singleSessionOnly: typeof session.singleSessionOnly === 'boolean'
                ? session.singleSessionOnly
                : d.session.singleSessionOnly,
        },
        security: {
            requireReauthForReveal: typeof security.requireReauthForReveal === 'boolean'
                ? security.requireReauthForReveal
                : d.security.requireReauthForReveal,
            requireReauthForStaffInvite: typeof security.requireReauthForStaffInvite === 'boolean'
                ? security.requireReauthForStaffInvite
                : d.security.requireReauthForStaffInvite,
            requireReauthForWalletAdjust: typeof security.requireReauthForWalletAdjust === 'boolean'
                ? security.requireReauthForWalletAdjust
                : d.security.requireReauthForWalletAdjust,
            allowViewerCsvExport: typeof security.allowViewerCsvExport === 'boolean'
                ? security.allowViewerCsvExport
                : d.security.allowViewerCsvExport,
            ipAllowlistNote: String(security.ipAllowlistNote ?? d.security.ipAllowlistNote).slice(0, 500),
            auditRetentionDays: clampNum(security.auditRetentionDays, 7, 3650, d.security.auditRetentionDays),
            auditAutoPurge: typeof security.auditAutoPurge === 'boolean'
                ? security.auditAutoPurge
                : d.security.auditAutoPurge,
            lastAuditPurgeAt: typeof security.lastAuditPurgeAt === 'string' &&
                security.lastAuditPurgeAt.trim()
                ? security.lastAuditPurgeAt.trim().slice(0, 40)
                : null,
        },
    };
}
//# sourceMappingURL=settings-security.js.map