"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REFRESH_COOKIE = exports.ACCESS_COOKIE = void 0;
exports.accessTtlMs = accessTtlMs;
exports.authCookieBase = authCookieBase;
exports.setAuthCookies = setAuthCookies;
exports.clearAuthCookies = clearAuthCookies;
const ACCESS_COOKIE = 'access_token';
exports.ACCESS_COOKIE = ACCESS_COOKIE;
const REFRESH_COOKIE = 'refresh_token';
exports.REFRESH_COOKIE = REFRESH_COOKIE;
function accessTtlMs(raw) {
    const v = (raw ?? '15m').trim();
    const m = /^(\d+)([smhd])$/i.exec(v);
    if (!m)
        return 15 * 60 * 1000;
    const n = Number(m[1]);
    const unit = m[2].toLowerCase();
    if (unit === 's')
        return n * 1000;
    if (unit === 'm')
        return n * 60 * 1000;
    if (unit === 'h')
        return n * 60 * 60 * 1000;
    if (unit === 'd')
        return n * 24 * 60 * 60 * 1000;
    return 15 * 60 * 1000;
}
function authCookieBase(config) {
    const corsOrigin = config.get('CORS_ORIGIN') ?? '';
    const secure = process.env.NODE_ENV === 'production' ||
        corsOrigin.startsWith('https://');
    return {
        httpOnly: true,
        secure,
        sameSite: 'lax',
    };
}
function setAuthCookies(res, config, tokens, refreshDays) {
    const base = authCookieBase(config);
    const accessMs = accessTtlMs(config.get('JWT_ACCESS_TTL'));
    res.cookie(ACCESS_COOKIE, tokens.accessToken, {
        ...base,
        path: '/api/v1',
        maxAge: accessMs,
    });
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
        ...base,
        path: '/api/v1/auth',
        ...(refreshDays > 0
            ? { maxAge: refreshDays * 24 * 60 * 60 * 1000 }
            : {}),
    });
}
function clearAuthCookies(res, config) {
    const base = authCookieBase(config);
    res.clearCookie(ACCESS_COOKIE, { ...base, path: '/api/v1' });
    res.clearCookie(REFRESH_COOKIE, { ...base, path: '/api/v1/auth' });
}
//# sourceMappingURL=auth-cookies.js.map