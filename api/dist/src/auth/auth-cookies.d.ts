import type { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';
declare const ACCESS_COOKIE = "access_token";
declare const REFRESH_COOKIE = "refresh_token";
export declare function accessTtlMs(raw: string | undefined): number;
export declare function authCookieBase(config: ConfigService): Pick<CookieOptions, 'httpOnly' | 'secure' | 'sameSite'>;
export declare function setAuthCookies(res: Response, config: ConfigService, tokens: {
    accessToken: string;
    refreshToken: string;
}, refreshDays: number): void;
export declare function clearAuthCookies(res: Response, config: ConfigService): void;
export { ACCESS_COOKIE, REFRESH_COOKIE };
