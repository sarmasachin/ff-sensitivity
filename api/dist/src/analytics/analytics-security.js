"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCREEN_SESSION_MAX_MS = exports.SCREEN_SESSION_MIN_MS = exports.CLIENT_EVENT_NAMES = exports.ALLOWED_EVENT_NAMES = exports.OPEN_EVENT_NAMES = void 0;
exports.assertEventName = assertEventName;
exports.assertClientEventName = assertClientEventName;
exports.optionalInstallId = optionalInstallId;
exports.sanitizeScreenSessionProps = sanitizeScreenSessionProps;
exports.sanitizeProps = sanitizeProps;
const app_error_1 = require("../common/errors/app-error");
const devices_security_1 = require("../devices/devices-security");
exports.OPEN_EVENT_NAMES = ['app_open', 'home_open'];
exports.ALLOWED_EVENT_NAMES = [
    'app_open',
    'home_open',
    'screen_session',
    'logout',
    'redeem_claim',
    'scratch_roll',
    'challenge_quiz_submit',
];
exports.CLIENT_EVENT_NAMES = [
    'app_open',
    'home_open',
    'screen_session',
];
const ALLOWED_SET = new Set(exports.ALLOWED_EVENT_NAMES);
const CLIENT_SET = new Set(exports.CLIENT_EVENT_NAMES);
function assertEventName(raw) {
    const name = (raw ?? '').trim().toLowerCase();
    if (!ALLOWED_SET.has(name)) {
        throw new app_error_1.AppError('ANALYTICS_BAD_EVENT', 'Event name is not allowed.', 400);
    }
    return name;
}
function assertClientEventName(raw) {
    const name = assertEventName(raw);
    if (!CLIENT_SET.has(name)) {
        throw new app_error_1.AppError('ANALYTICS_SERVER_ONLY', 'This event is recorded server-side only.', 400);
    }
    return name;
}
function optionalInstallId(raw) {
    if (raw == null || String(raw).trim() === '')
        return null;
    return (0, devices_security_1.assertInstallId)(String(raw));
}
exports.SCREEN_SESSION_MIN_MS = 1_000;
exports.SCREEN_SESSION_MAX_MS = 30 * 60 * 1_000;
function sanitizeScreenSessionProps(raw) {
    if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
        throw new app_error_1.AppError('ANALYTICS_BAD_SCREEN_SESSION', 'Screen session props are required.', 400);
    }
    const props = raw;
    const screen = String(props.screen ?? '')
        .trim()
        .toLowerCase();
    const duration = Number(props.duration_ms);
    if (!/^[a-z][a-z0-9_]{0,31}$/.test(screen)) {
        throw new app_error_1.AppError('ANALYTICS_BAD_SCREEN', 'Invalid analytics screen.', 400);
    }
    if (!Number.isInteger(duration) ||
        duration < exports.SCREEN_SESSION_MIN_MS ||
        duration > exports.SCREEN_SESSION_MAX_MS) {
        throw new app_error_1.AppError('ANALYTICS_BAD_DURATION', 'Screen duration is outside the allowed range.', 400);
    }
    return { screen, duration_ms: duration };
}
function sanitizeProps(raw) {
    if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
        return null;
    }
    const out = {};
    const entries = Object.entries(raw).slice(0, 8);
    for (const [k, v] of entries) {
        const key = String(k)
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '')
            .slice(0, 32);
        if (!key)
            continue;
        if (key.includes('token') ||
            key.includes('password') ||
            key.includes('secret') ||
            key.includes('email')) {
            continue;
        }
        if (typeof v === 'boolean' || typeof v === 'number') {
            if (typeof v === 'number' && !Number.isFinite(v))
                continue;
            out[key] = typeof v === 'number' ? Math.max(-1e9, Math.min(1e9, v)) : v;
            continue;
        }
        if (typeof v === 'string') {
            const s = [...v]
                .filter((ch) => {
                const code = ch.codePointAt(0) ?? 0;
                return code >= 0x20 && code !== 0x7f;
            })
                .join('')
                .trim()
                .slice(0, 80);
            if (s)
                out[key] = s;
        }
    }
    return Object.keys(out).length ? out : null;
}
//# sourceMappingURL=analytics-security.js.map