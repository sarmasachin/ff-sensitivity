"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_APP_CONFIG = exports.APP_NAV_KEYS = exports.APP_FEATURE_KEYS = void 0;
exports.sanitizeText = sanitizeText;
exports.assertSafeText = assertSafeText;
exports.assertSafeHttpsUrl = assertSafeHttpsUrl;
exports.normalizeBoolMap = normalizeBoolMap;
const app_error_1 = require("../common/errors/app-error");
exports.APP_FEATURE_KEYS = [
    'redeem',
    'shop',
    'challenge',
    'scratch',
    'share',
    'names',
    'community',
    'support',
];
exports.APP_NAV_KEYS = [
    'homeRedeem',
    'homeShop',
    'homeChallenge',
    'homeScratch',
    'homeNames',
    'homeShare',
    'navCommunity',
    'navSupport',
    'navAbout',
];
function sanitizeText(raw, max) {
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
function assertSafeText(text, field) {
    const lower = text.toLowerCase();
    if (lower.includes('javascript:') ||
        lower.includes('data:text/html') ||
        /<script[\s>]/i.test(text)) {
        throw new app_error_1.AppError('APP_UNSAFE_TEXT', `${field} contains disallowed content.`, 400);
    }
}
function isBlockedHost(hostname) {
    const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (!h || h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local')) {
        return true;
    }
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) {
        const [a, b] = h.split('.').map((n) => Number(n));
        if (a === 0 || a === 10 || a === 127)
            return true;
        if (a === 169 && b === 254)
            return true;
        if (a === 172 && b >= 16 && b <= 31)
            return true;
        if (a === 192 && b === 168)
            return true;
        if (a === 100 && b >= 64 && b <= 127)
            return true;
    }
    if (h.includes(':')) {
        if (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) {
            return true;
        }
    }
    return false;
}
function assertSafeHttpsUrl(raw, field) {
    const url = sanitizeText(raw, 300);
    let parsed;
    try {
        parsed = new URL(url);
    }
    catch {
        throw new app_error_1.AppError('APP_BAD_URL', `${field} is invalid.`, 400);
    }
    if (parsed.protocol !== 'https:') {
        throw new app_error_1.AppError('APP_BAD_URL', `${field} must use https.`, 400);
    }
    if (parsed.username || parsed.password) {
        throw new app_error_1.AppError('APP_BAD_URL', `${field} must not include credentials.`, 400);
    }
    if (isBlockedHost(parsed.hostname)) {
        throw new app_error_1.AppError('APP_BAD_URL', `${field} host is not allowed.`, 400);
    }
    return parsed.toString();
}
function normalizeBoolMap(raw, keys, fallbackTrue = true) {
    const out = {};
    for (const k of keys) {
        const v = raw?.[k];
        out[k] = typeof v === 'boolean' ? v : fallbackTrue;
    }
    return out;
}
exports.DEFAULT_APP_CONFIG = {
    status: {
        maintenanceMode: false,
        maintenanceMessage: 'We are performing scheduled maintenance. Please try again shortly.',
        forceUpdate: false,
        softUpdatePrompt: true,
        minVersionCode: 1,
        minVersionName: '1.0.0',
    },
    features: Object.fromEntries(exports.APP_FEATURE_KEYS.map((k) => [k, true])),
    navigation: Object.fromEntries(exports.APP_NAV_KEYS.map((k) => [k, true])),
    links: {
        playStoreUrl: 'https://play.google.com/store/apps/details?id=com.ffsensitivity.app',
        privacyUrl: 'https://app.sensitivitysettings.com/privacy',
        websiteUrl: 'https://sensitivitysettings.com',
        supportEmail: 'support@sensitivitysettings.com',
    },
};
//# sourceMappingURL=app-config-security.js.map