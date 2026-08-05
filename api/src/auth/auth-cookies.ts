import type { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

/** Parse JWT_ACCESS_TTL like 15m / 900s / 1h into milliseconds. */
export function accessTtlMs(raw: string | undefined): number {
  const v = (raw ?? '15m').trim();
  const m = /^(\d+)([smhd])$/i.exec(v);
  if (!m) return 15 * 60 * 1000;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  if (unit === 's') return n * 1000;
  if (unit === 'm') return n * 60 * 1000;
  if (unit === 'h') return n * 60 * 60 * 1000;
  if (unit === 'd') return n * 24 * 60 * 60 * 1000;
  return 15 * 60 * 1000;
}

export function authCookieBase(
  config: ConfigService,
): Pick<CookieOptions, 'httpOnly' | 'secure' | 'sameSite'> {
  const corsOrigin = config.get<string>('CORS_ORIGIN') ?? '';
  const secure =
    process.env.NODE_ENV === 'production' ||
    corsOrigin.startsWith('https://');
  return {
    httpOnly: true,
    secure,
    // Lax: same-site subdomain XHR (app. → api.) with credentials.
    sameSite: 'lax',
  };
}

export function setAuthCookies(
  res: Response,
  config: ConfigService,
  tokens: { accessToken: string; refreshToken: string },
  refreshDays: number,
) {
  const base = authCookieBase(config);
  const accessMs = accessTtlMs(config.get<string>('JWT_ACCESS_TTL'));
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

export function clearAuthCookies(res: Response, config: ConfigService) {
  const base = authCookieBase(config);
  res.clearCookie(ACCESS_COOKIE, { ...base, path: '/api/v1' });
  res.clearCookie(REFRESH_COOKIE, { ...base, path: '/api/v1/auth' });
}

export { ACCESS_COOKIE, REFRESH_COOKIE };
