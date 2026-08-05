"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeUserText = sanitizeUserText;
exports.assertSafeUserText = assertSafeUserText;
exports.assertUserId = assertUserId;
exports.maskEmail = maskEmail;
exports.maskGoogleSub = maskGoogleSub;
exports.hoursAgo = hoursAgo;
exports.formatWhen = formatWhen;
exports.formatJoined = formatJoined;
exports.mapAccountStatus = mapAccountStatus;
const app_error_1 = require("../common/errors/app-error");
function sanitizeUserText(raw, max) {
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
function assertSafeUserText(text, field) {
    const lower = text.toLowerCase();
    if (lower.includes('javascript:') ||
        lower.includes('data:text/html') ||
        /<script[\s>]/i.test(text)) {
        throw new app_error_1.AppError('USER_UNSAFE_TEXT', `${field} contains disallowed content.`, 400);
    }
}
function assertUserId(raw) {
    const id = sanitizeUserText(raw, 40);
    if (!/^[a-z0-9_-]{8,40}$/i.test(id)) {
        throw new app_error_1.AppError('USER_BAD_ID', 'Invalid user id.', 400);
    }
    return id;
}
function maskEmail(email) {
    const [local, domain] = email.split('@');
    if (!domain)
        return '***';
    const keep = local.slice(0, 2);
    return `${keep}***@${domain}`;
}
function maskGoogleSub(googleSub) {
    const clean = sanitizeUserText(googleSub, 128);
    if (clean.length < 4)
        return 'goog_…****';
    const tip = clean.slice(-4);
    return `goog_…${tip}`;
}
function hoursAgo(from, now = new Date()) {
    return Math.max(0, (now.getTime() - from.getTime()) / 3_600_000);
}
function formatWhen(hours) {
    if (hours < 1) {
        const mins = Math.max(1, Math.round(hours * 60));
        return `${mins} min ago`;
    }
    if (hours < 48)
        return `${Math.round(hours)}h ago`;
    return `${Math.round(hours / 24)}d ago`;
}
function formatJoined(d) {
    return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}
function mapAccountStatus(isActive, isRestricted) {
    if (!isActive)
        return 'SUSPENDED';
    if (isRestricted)
        return 'RESTRICTED';
    return 'ACTIVE';
}
//# sourceMappingURL=users-security.js.map