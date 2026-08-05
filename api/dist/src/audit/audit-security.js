"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hoursAgo = hoursAgo;
exports.formatWhen = formatWhen;
exports.maskEmail = maskEmail;
exports.mapCategory = mapCategory;
exports.mapResult = mapResult;
exports.humanAction = humanAction;
exports.extractIp = extractIp;
exports.redactObject = redactObject;
exports.summarizeDetail = summarizeDetail;
exports.assertAuditLimit = assertAuditLimit;
const app_error_1 = require("../common/errors/app-error");
const SECRET_KEYS = new Set([
    'password',
    'passwordhash',
    'temporarypassword',
    'temppassword',
    'secret',
    'code',
    'codesecret',
    'plaincode',
    'rawcode',
    'token',
    'accesstoken',
    'refreshtoken',
    'idtoken',
    'apikey',
    'privatekey',
    'authorization',
    'phone',
    'mobile',
    'phonenumber',
]);
function looksLikeEmailKey(key) {
    const k = key.toLowerCase();
    return k.includes('email') || k === 'mail';
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
function maskEmail(email) {
    const [local, domain] = email.split('@');
    if (!domain)
        return '***';
    const keep = local.slice(0, 2);
    return `${keep}***@${domain}`;
}
function mapCategory(action) {
    const a = (action ?? '').toLowerCase();
    if (a.startsWith('auth.') || a.includes('login'))
        return 'LOGIN';
    if (a.startsWith('staff:'))
        return 'STAFF';
    if (a.startsWith('wallets.') || a.startsWith('wallet'))
        return 'WALLET';
    if (a.startsWith('devices.') || a.startsWith('device'))
        return 'DEVICE';
    if (a.startsWith('claims.') || a.startsWith('redeem'))
        return 'REDEEM';
    if (a.startsWith('inventory') || a.includes('stock'))
        return 'INVENTORY';
    return 'CONFIG';
}
function mapResult(action, after) {
    const a = (action ?? '').toLowerCase();
    if (a.includes('denied') || a.includes('forbidden'))
        return 'DENIED';
    if (a.includes('fail') || a.includes('invalid'))
        return 'FAILED';
    if (after && typeof after === 'object' && !Array.isArray(after)) {
        const obj = after;
        if (obj.ok === false || obj.success === false)
            return 'FAILED';
        if (obj.denied === true)
            return 'DENIED';
    }
    return 'SUCCESS';
}
function humanAction(action) {
    const map = {
        'auth.login': 'Session start',
        'auth.profile_update': 'Profile update',
        'auth.password_change': 'Password change',
        'staff:invite': 'Invite sent',
        'staff:modules': 'Modules updated',
        'staff:disable': 'Staff disabled',
        'staff:enable': 'Staff enabled',
        'staff:resend_invite': 'Invite resent',
        'app.config_save': 'App config save',
        'copy.config_save': 'Copy config save',
        'wallets.grant': 'Grant coins',
        'wallets.revoke': 'Revoke coins',
        'wallets.freeze': 'Wallet freeze',
        'wallets.unfreeze': 'Wallet unfreeze',
    };
    if (map[action])
        return map[action];
    const cleaned = action.replace(/^[a-z_]+:?/i, '').replace(/[._]/g, ' ').trim();
    if (!cleaned)
        return action || 'Event';
    return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
}
function extractIp(after) {
    if (!after || typeof after !== 'object' || Array.isArray(after))
        return '—';
    const obj = after;
    const ip = obj.ip ?? obj.clientIp ?? obj.remoteAddress;
    if (typeof ip === 'string' && ip.trim())
        return ip.trim().slice(0, 64);
    return '—';
}
function redactValue(key, value) {
    const k = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (SECRET_KEYS.has(k)) {
        return '[redacted]';
    }
    if (typeof value === 'string' && value.includes('@') && looksLikeEmailKey(key)) {
        return maskEmail(value);
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return redactObject(value);
    }
    if (Array.isArray(value)) {
        return value.map((v, i) => redactValue(String(i), v));
    }
    if (typeof value === 'string' && value.length > 120) {
        return `${value.slice(0, 117)}…`;
    }
    return value;
}
function redactObject(raw) {
    if (!raw)
        return null;
    const out = {};
    for (const [k, v] of Object.entries(raw)) {
        out[k] = redactValue(k, v);
    }
    return out;
}
function summarizeDetail(before, after, max = 280) {
    const b = before && typeof before === 'object'
        ? redactObject(before)
        : null;
    const a = after && typeof after === 'object'
        ? redactObject(after)
        : null;
    if (!b && !a)
        return '—';
    let text;
    try {
        if (b && a)
            text = `${JSON.stringify(b)} → ${JSON.stringify(a)}`;
        else
            text = JSON.stringify(a ?? b);
    }
    catch {
        return '—';
    }
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
function assertAuditLimit(n) {
    if (!Number.isFinite(n) || n < 1 || n > 500) {
        throw new app_error_1.AppError('AUDIT_BAD_LIMIT', 'Limit must be 1–500.', 400);
    }
    return Math.floor(n);
}
//# sourceMappingURL=audit-security.js.map