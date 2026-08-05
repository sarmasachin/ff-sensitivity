"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_COINS = exports.MAX_STAFF_ADJUST = void 0;
exports.sanitizeWalletText = sanitizeWalletText;
exports.assertSafeWalletText = assertSafeWalletText;
exports.assertUserId = assertUserId;
exports.assertAdjustAmount = assertAdjustAmount;
exports.assertRequestId = assertRequestId;
exports.maskEmail = maskEmail;
exports.hoursAgo = hoursAgo;
exports.formatWhen = formatWhen;
exports.mapLedgerKind = mapLedgerKind;
exports.mapLedgerActor = mapLedgerActor;
const app_error_1 = require("../common/errors/app-error");
exports.MAX_STAFF_ADJUST = 100_000;
exports.MAX_COINS = 9_999_999;
function sanitizeWalletText(raw, max) {
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
function assertSafeWalletText(text, field) {
    const lower = text.toLowerCase();
    if (lower.includes('javascript:') ||
        lower.includes('data:text/html') ||
        /<script[\s>]/i.test(text)) {
        throw new app_error_1.AppError('WALLET_UNSAFE_TEXT', `${field} contains disallowed content.`, 400);
    }
}
function assertUserId(raw) {
    const id = sanitizeWalletText(raw, 40);
    if (!/^[a-z0-9_-]{8,40}$/i.test(id)) {
        throw new app_error_1.AppError('WALLET_BAD_ID', 'Invalid wallet id.', 400);
    }
    return id;
}
function assertAdjustAmount(n) {
    if (!Number.isInteger(n) || n < 1 || n > exports.MAX_STAFF_ADJUST) {
        throw new app_error_1.AppError('WALLET_BAD_AMOUNT', `Amount must be 1–${exports.MAX_STAFF_ADJUST}.`, 400);
    }
    return n;
}
function assertRequestId(raw) {
    const id = sanitizeWalletText(raw, 80);
    if (id.length < 8 || !/^[a-zA-Z0-9_-]+$/.test(id)) {
        throw new app_error_1.AppError('WALLET_BAD_REQUEST', 'Invalid request id.', 400);
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
function mapLedgerKind(reason, delta) {
    const r = reason.toLowerCase();
    if (r.startsWith('staff:grant'))
        return 'GRANT';
    if (r.startsWith('staff:revoke'))
        return 'REVOKE';
    if (r.startsWith('staff:'))
        return 'ADJUST';
    if (r.startsWith('shop:'))
        return 'PURCHASE';
    if (r.startsWith('earn:'))
        return 'EARN';
    if (delta < 0)
        return 'SPEND';
    if (delta > 0)
        return 'EARN';
    return 'ADJUST';
}
function mapLedgerActor(reason) {
    const r = reason.toLowerCase();
    if (r.startsWith('staff:'))
        return 'staff';
    if (r.startsWith('shop:'))
        return 'store';
    return 'system';
}
//# sourceMappingURL=wallets-security.js.map