"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STALE_HOURS = void 0;
exports.sanitizeDeviceText = sanitizeDeviceText;
exports.assertSafeDeviceText = assertSafeDeviceText;
exports.assertInstallId = assertInstallId;
exports.maskFcmToken = maskFcmToken;
exports.tokenHintFromFull = tokenHintFromFull;
exports.hoursAgo = hoursAgo;
exports.formatLastSeen = formatLastSeen;
exports.computeDeviceStatus = computeDeviceStatus;
const app_error_1 = require("../common/errors/app-error");
exports.STALE_HOURS = 72;
function sanitizeDeviceText(raw, max) {
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
function assertSafeDeviceText(text, field) {
    const lower = text.toLowerCase();
    if (lower.includes('javascript:') ||
        lower.includes('data:text/html') ||
        /<script[\s>]/i.test(text)) {
        throw new app_error_1.AppError('DEVICE_UNSAFE_TEXT', `${field} contains disallowed content.`, 400);
    }
}
function assertInstallId(raw) {
    const id = sanitizeDeviceText(raw, 64).toLowerCase();
    if (!/^dev_[a-z0-9]{8,40}$/.test(id)) {
        throw new app_error_1.AppError('DEVICE_BAD_INSTALL_ID', 'Install id must look like dev_<hex>.', 400);
    }
    return id;
}
function maskFcmToken(token) {
    const t = token.trim();
    if (t.length < 8)
        return '—';
    return `fcm_…${t.slice(-4)} · ****${t.slice(-4)}`;
}
function tokenHintFromFull(token) {
    const t = token.trim();
    if (t.length < 8)
        return '';
    return `${t.slice(0, 4)}…${t.slice(-4)}`;
}
function hoursAgo(from, now = new Date()) {
    return Math.max(0, (now.getTime() - from.getTime()) / 3_600_000);
}
function formatLastSeen(hours) {
    if (hours < 1) {
        const mins = Math.max(1, Math.round(hours * 60));
        return `${mins} min ago`;
    }
    if (hours < 48)
        return `${Math.round(hours)}h ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
}
function computeDeviceStatus(opts) {
    if (opts.blocked)
        return 'BLOCKED';
    const h = hoursAgo(opts.lastSeenAt, opts.now);
    return h > exports.STALE_HOURS ? 'STALE' : 'ACTIVE';
}
//# sourceMappingURL=devices-security.js.map