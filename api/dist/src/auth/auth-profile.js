"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeProfileText = sanitizeProfileText;
exports.assertSafeProfileText = assertSafeProfileText;
exports.assertPhone = assertPhone;
exports.defaultDisplayName = defaultDisplayName;
exports.toProfileView = toProfileView;
const app_error_1 = require("../common/errors/app-error");
function sanitizeProfileText(raw, max) {
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
function assertSafeProfileText(text, field) {
    const lower = text.toLowerCase();
    if (lower.includes('javascript:') ||
        lower.includes('data:text/html') ||
        /<script[\s>]/i.test(text)) {
        throw new app_error_1.AppError('PROFILE_UNSAFE_TEXT', `${field} contains disallowed content.`, 400);
    }
}
function assertPhone(phone) {
    if (!phone)
        return;
    if (!/^[+\d][\d\s()-]{6,30}$/.test(phone)) {
        throw new app_error_1.AppError('PROFILE_BAD_PHONE', 'Phone format looks invalid.', 400);
    }
}
function defaultDisplayName(email) {
    const local = email.split('@')[0] ?? 'Operator';
    const pretty = local
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
    return pretty || 'Operator';
}
function toProfileView(admin) {
    return {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        allowedModules: admin.allowedModules,
        mustChangePassword: admin.mustChangePassword,
        lastLoginAt: admin.lastLoginAt,
        displayName: admin.displayName?.trim() || defaultDisplayName(admin.email),
        jobTitle: admin.jobTitle?.trim() || 'Staff',
        deskLabel: admin.deskLabel?.trim() || 'FF Sensitivity Ops',
        notifyEmail: admin.notifyEmail?.trim() || admin.email,
        phone: admin.phone?.trim() || '',
        timezoneLabel: admin.timezoneLabel?.trim() || 'Asia/Kolkata (IST)',
        digestDaily: admin.digestDaily,
        digestSecurity: admin.digestSecurity,
    };
}
//# sourceMappingURL=auth-profile.js.map