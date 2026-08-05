"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INVITE_ROLES = exports.ASSIGNABLE_MODULES = void 0;
exports.sanitizeStaffText = sanitizeStaffText;
exports.assertSafeStaffText = assertSafeStaffText;
exports.assertStaffId = assertStaffId;
exports.assertStaffEmail = assertStaffEmail;
exports.normalizeModules = normalizeModules;
exports.assertInviteRole = assertInviteRole;
exports.generateTempPassword = generateTempPassword;
exports.hoursAgo = hoursAgo;
exports.formatWhen = formatWhen;
exports.formatDay = formatDay;
exports.mapStaffStatus = mapStaffStatus;
exports.mapModulesForUi = mapModulesForUi;
const crypto_1 = require("crypto");
const client_1 = require("@prisma/client");
const app_error_1 = require("../common/errors/app-error");
exports.ASSIGNABLE_MODULES = [
    client_1.AdminModule.redeem,
    client_1.AdminModule.shop,
    client_1.AdminModule.community,
    client_1.AdminModule.claims,
    client_1.AdminModule.daily_challenge,
    client_1.AdminModule.scratch,
    client_1.AdminModule.names,
    client_1.AdminModule.support,
    client_1.AdminModule.promos,
    client_1.AdminModule.push,
    client_1.AdminModule.app,
    client_1.AdminModule.devices,
    client_1.AdminModule.wallets,
    client_1.AdminModule.users,
    client_1.AdminModule.copy,
    client_1.AdminModule.staff,
    client_1.AdminModule.audit,
    client_1.AdminModule.settings,
    client_1.AdminModule.overview,
];
exports.INVITE_ROLES = [
    client_1.AdminRole.ADMIN,
    client_1.AdminRole.SUB_ADMIN,
    client_1.AdminRole.VIEWER,
];
function sanitizeStaffText(raw, max) {
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
function assertSafeStaffText(text, field) {
    const lower = text.toLowerCase();
    if (lower.includes('javascript:') ||
        lower.includes('data:text/html') ||
        /<script[\s>]/i.test(text)) {
        throw new app_error_1.AppError('STAFF_UNSAFE_TEXT', `${field} contains disallowed content.`, 400);
    }
}
function assertStaffId(raw) {
    const id = sanitizeStaffText(raw, 40);
    if (!/^[a-z0-9_-]{8,40}$/i.test(id)) {
        throw new app_error_1.AppError('STAFF_BAD_ID', 'Invalid staff id.', 400);
    }
    return id;
}
function assertStaffEmail(raw) {
    const email = sanitizeStaffText(raw, 120).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new app_error_1.AppError('STAFF_BAD_EMAIL', 'Enter a valid email.', 400);
    }
    return email;
}
function normalizeModules(raw) {
    if (!Array.isArray(raw)) {
        throw new app_error_1.AppError('STAFF_BAD_MODULES', 'Modules must be an array.', 400);
    }
    const out = new Set();
    for (const item of raw) {
        const key = String(item ?? '').trim();
        const mapped = key === 'challenge' ? client_1.AdminModule.daily_challenge : key;
        if (!exports.ASSIGNABLE_MODULES.includes(mapped)) {
            throw new app_error_1.AppError('STAFF_BAD_MODULES', `Unknown or disallowed module: ${key}`, 400);
        }
        out.add(mapped);
    }
    if (out.size === 0) {
        throw new app_error_1.AppError('STAFF_BAD_MODULES', 'Assign at least one module.', 400);
    }
    return [...out];
}
function assertInviteRole(raw) {
    const role = sanitizeStaffText(raw, 20);
    if (!exports.INVITE_ROLES.includes(role)) {
        throw new app_error_1.AppError('STAFF_BAD_ROLE', 'Invite role must be ADMIN, SUB_ADMIN, or VIEWER.', 400);
    }
    return role;
}
function generateTempPassword() {
    return `Tmp-${(0, crypto_1.randomBytes)(9).toString('base64url')}`;
}
function hoursAgo(from, now = new Date()) {
    if (!from)
        return null;
    return Math.max(0, (now.getTime() - from.getTime()) / 3_600_000);
}
function formatWhen(hours) {
    if (hours == null)
        return 'Never';
    if (hours < 1) {
        const mins = Math.max(1, Math.round(hours * 60));
        return `${mins} min ago`;
    }
    if (hours < 48)
        return `${Math.round(hours)}h ago`;
    return `${Math.round(hours / 24)}d ago`;
}
function formatDay(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function mapStaffStatus(admin) {
    if (!admin.isActive)
        return 'DISABLED';
    if (!admin.lastLoginAt && admin.mustChangePassword)
        return 'INVITED';
    return 'ACTIVE';
}
function mapModulesForUi(modules) {
    return modules.map((m) => m === client_1.AdminModule.daily_challenge ? 'challenge' : m);
}
//# sourceMappingURL=staff-security.js.map