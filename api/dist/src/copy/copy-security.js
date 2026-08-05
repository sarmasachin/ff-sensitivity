"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_COPY_CONFIG = void 0;
exports.sanitizeCopyText = sanitizeCopyText;
exports.sanitizeCopyMultiline = sanitizeCopyMultiline;
exports.assertSafeCopyText = assertSafeCopyText;
exports.assertSafeFooterLine = assertSafeFooterLine;
exports.assertAllowedPlaceholders = assertAllowedPlaceholders;
exports.normalizePlaceholders = normalizePlaceholders;
const app_error_1 = require("../common/errors/app-error");
const app_config_security_1 = require("../app-config/app-config-security");
function sanitizeCopyText(raw, max) {
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
function sanitizeCopyMultiline(raw, max) {
    return [...(raw ?? '')]
        .filter((ch) => {
        const code = ch.codePointAt(0) ?? 0;
        if (ch === '\n' || ch === '\r')
            return true;
        if (code < 0x20 || code === 0x7f)
            return false;
        if (code >= 0x200b && code <= 0x200f)
            return false;
        if (code === 0xfeff)
            return false;
        return true;
    })
        .join('')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim()
        .slice(0, max);
}
function assertSafeCopyText(text, field) {
    const lower = text.toLowerCase();
    if (lower.includes('javascript:') ||
        lower.includes('data:text/html') ||
        /<script[\s>]/i.test(text)) {
        throw new app_error_1.AppError('COPY_UNSAFE_TEXT', `${field} contains disallowed content.`, 400);
    }
}
function assertSafeFooterLine(raw) {
    const text = sanitizeCopyText(raw, 300);
    if (!text) {
        throw new app_error_1.AppError('COPY_BAD_FOOTER', 'Share footer line is required.', 400);
    }
    assertSafeCopyText(text, 'Share footer');
    if (/^https?:\/\//i.test(text)) {
        return (0, app_config_security_1.assertSafeHttpsUrl)(text, 'Share footer');
    }
    return text;
}
function assertAllowedPlaceholders(template) {
    const found = template.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g) ?? [];
    for (const token of found) {
        const key = token.replace(/[{}]/g, '').trim();
        if (key !== 'device' && key !== 'settings') {
            throw new app_error_1.AppError('COPY_BAD_PLACEHOLDER', `Unknown placeholder {{${key}}}. Only {{device}} and {{settings}} are allowed.`, 400);
        }
    }
}
function normalizePlaceholders(template) {
    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => `{{${key}}}`);
}
exports.DEFAULT_COPY_CONFIG = {
    rate: {
        enabled: true,
        title: 'Enjoying FF Sensitivity?',
        body: 'A quick Play Store rating helps more players find accurate sensitivity settings.',
        primaryCta: 'Rate on Play Store',
        secondaryCta: 'Not now',
        minSessions: 3,
    },
    share: {
        sheetTitle: 'Share sensitivity',
        bodyTemplate: 'My Free Fire sensitivity for {{device}} — generated with FF Sensitivity.\n\n{{settings}}\n\nGet yours:',
        footerLine: 'https://sensitivitysettings.com',
        hashtags: '#FreeFire #FFSensitivity',
    },
    about: {
        headline: 'FF Sensitivity',
        blurb: 'Device-aware Free Fire sensitivity, stylish names, daily challenges, and redeem tools — built for serious players.',
        versionPrefix: 'Version',
        websiteCta: 'Visit website',
        privacyCta: 'View privacy policy',
    },
    legal: {
        privacyLabel: 'Privacy policy',
        termsLabel: 'Terms of use',
        supportLabel: 'Contact support',
        storeLabel: 'Rate on Google Play',
    },
};
//# sourceMappingURL=copy-security.js.map