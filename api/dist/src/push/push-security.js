"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLOWED_PUSH_DEEP_PATHS = void 0;
exports.sanitizePushText = sanitizePushText;
exports.assertSafePushText = assertSafePushText;
exports.assertSafeDeepLink = assertSafeDeepLink;
exports.assertTopic = assertTopic;
exports.parseStamp = parseStamp;
exports.stamp = stamp;
const app_error_1 = require("../common/errors/app-error");
exports.ALLOWED_PUSH_DEEP_PATHS = new Set([
    'home',
    'challenge',
    'daily_challenge',
    'scratch',
    'shop',
    'coin_shop',
    'redeem',
    'names',
    'stylish',
    'inbox',
    'notifications',
    'push_inbox',
    'contact',
    'support',
    'about',
    'share',
    'share_sensi',
    'sensi',
    'hud',
    'graphics',
    'dpi',
]);
function sanitizePushText(raw, max) {
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
function assertSafePushText(text, field) {
    const lower = text.toLowerCase();
    if (lower.includes('javascript:') ||
        lower.includes('data:text/html') ||
        /<script[\s>]/i.test(text)) {
        throw new app_error_1.AppError('PUSH_UNSAFE_TEXT', `${field} contains disallowed content.`, 400);
    }
}
function assertSafeDeepLink(raw) {
    const link = sanitizePushText(raw, 120).toLowerCase();
    let parsed;
    try {
        parsed = new URL(link);
    }
    catch {
        throw new app_error_1.AppError('PUSH_BAD_LINK', 'Deep link is invalid.', 400);
    }
    if (parsed.protocol !== 'ffops:') {
        throw new app_error_1.AppError('PUSH_BAD_LINK', 'Deep link must use the ffops:// scheme.', 400);
    }
    if (parsed.username || parsed.password) {
        throw new app_error_1.AppError('PUSH_BAD_LINK', 'Deep link must not include credentials.', 400);
    }
    const path = (parsed.hostname || parsed.pathname.replace(/^\//, ''))
        .split('/')[0]
        ?.replace(/[^a-z0-9_]/g, '');
    if (!path || !exports.ALLOWED_PUSH_DEEP_PATHS.has(path)) {
        throw new app_error_1.AppError('PUSH_BAD_LINK', 'Deep link path is not allowlisted.', 400);
    }
    return `ffops://${path}`;
}
function assertTopic(raw) {
    const topic = sanitizePushText(raw, 64).toLowerCase();
    if (!/^[a-z0-9_]{1,64}$/.test(topic)) {
        throw new app_error_1.AppError('PUSH_BAD_TOPIC', 'Topic must be snake_case alphanumeric.', 400);
    }
    return topic;
}
function parseStamp(raw) {
    const m = raw
        .trim()
        .match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!m) {
        throw new app_error_1.AppError('PUSH_BAD_STAMP', 'Invalid schedule stamp.', 400);
    }
    const [, y, mo, d, h, mi, sec] = m;
    const dt = new Date(`${y}-${mo}-${d}T${h}:${mi}:${sec ?? '00'}+05:30`);
    if (!Number.isFinite(dt.getTime())) {
        throw new app_error_1.AppError('PUSH_BAD_STAMP', 'Invalid schedule stamp.', 400);
    }
    return dt;
}
const IST = 'Asia/Kolkata';
function istPart(d, type) {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: IST,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(d);
    return parts.find((p) => p.type === type)?.value ?? '';
}
function stamp(d, withSeconds = false) {
    if (!d)
        return null;
    const y = istPart(d, 'year');
    const mo = istPart(d, 'month');
    const day = istPart(d, 'day');
    const h = istPart(d, 'hour');
    const mi = istPart(d, 'minute');
    if (!withSeconds)
        return `${y}-${mo}-${day} ${h}:${mi}`;
    const s = istPart(d, 'second');
    return `${y}-${mo}-${day} ${h}:${mi}:${s}`;
}
//# sourceMappingURL=push-security.js.map