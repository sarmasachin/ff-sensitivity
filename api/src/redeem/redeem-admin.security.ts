import { RedeemCodeStatus } from '@prisma/client';
import { AppError } from '../common/errors/app-error';

const STATUSES = new Set<string>(Object.values(RedeemCodeStatus));
const DEF_ID_RE = /^[A-Z][A-Z0-9_]{1,31}$/;

export function sanitizeRedeemText(raw: string, max: number): string {
  return [...(raw ?? '')]
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      if (code < 0x20 || code === 0x7f) return false;
      if (code >= 0x200b && code <= 0x200f) return false;
      return true;
    })
    .join('')
    .trim()
    .slice(0, max);
}

export function assertRedeemAdminId(raw: string): string {
  const id = (raw ?? '').trim();
  if (id.length < 10 || id.length > 40 || !/^[a-z0-9_-]+$/i.test(id)) {
    throw new AppError('REDEEM_INVALID_ID', 'Invalid redeem code id.', 400);
  }
  return id;
}

/** Type / cadence option id (UPPER_SNAKE). */
export function assertRedeemDefId(raw: string): string {
  const id = String(raw ?? '')
    .trim()
    .toUpperCase();
  if (!DEF_ID_RE.test(id)) {
    throw new AppError(
      'REDEEM_BAD_DEF_ID',
      'Id must be UPPER_SNAKE (2–32), e.g. GOOGLE_PLAY or DAILY.',
      400,
    );
  }
  return id;
}

export function assertRedeemType(raw: string): string {
  return assertRedeemDefId(raw);
}

export function assertRedeemCadence(raw: string): string {
  return assertRedeemDefId(raw);
}

export function assertRedeemStatus(raw: string): RedeemCodeStatus {
  if (!STATUSES.has(raw)) {
    throw new AppError('REDEEM_BAD_STATUS', 'Invalid redeem status.', 400);
  }
  return raw as RedeemCodeStatus;
}

export function assertStockLeft(n: number): number {
  if (!Number.isInteger(n) || (n !== 0 && n !== 1)) {
    throw new AppError(
      'REDEEM_STOCK_INVALID',
      'Stock must be 0 or 1 (one secret per row).',
      400,
    );
  }
  return n;
}

export function assertCodeSecret(raw: string): string {
  const secret = sanitizeRedeemText(raw, 80).toUpperCase();
  if (secret.length < 8) {
    throw new AppError(
      'REDEEM_BAD_SECRET',
      'Code must be at least 8 characters.',
      400,
    );
  }
  return secret;
}

export function assertSortOrder(n: unknown, fallback = 0): number {
  if (n == null || n === '') return fallback;
  const v = Number(n);
  if (!Number.isInteger(v) || v < 0 || v > 9999) {
    throw new AppError(
      'REDEEM_BAD_SORT',
      'Sort order must be 0–9999.',
      400,
    );
  }
  return v;
}

export function assertClaimLimit(n: unknown, fallback = 3): number {
  if (n == null || n === '') return fallback;
  const v = Number(n);
  if (!Number.isInteger(v) || v < 1 || v > 100) {
    throw new AppError(
      'REDEEM_BAD_CLAIM_LIMIT',
      'Claim limit must be 1–100.',
      400,
    );
  }
  return v;
}

export function assertWindowHours(n: unknown, fallback = 24): number {
  if (n == null || n === '') return fallback;
  const v = Number(n);
  if (!Number.isInteger(v) || v < 1 || v > 8760) {
    throw new AppError(
      'REDEEM_BAD_WINDOW_HOURS',
      'Window hours must be 1–8760.',
      400,
    );
  }
  return v;
}
