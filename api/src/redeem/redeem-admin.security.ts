import { RedeemCadence, RedeemCodeStatus, RedeemType } from '@prisma/client';
import { AppError } from '../common/errors/app-error';

const TYPES = new Set<string>(Object.values(RedeemType));
const STATUSES = new Set<string>(Object.values(RedeemCodeStatus));
const CADENCES = new Set<string>(Object.values(RedeemCadence));

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

export function assertRedeemType(raw: string): RedeemType {
  if (!TYPES.has(raw)) {
    throw new AppError('REDEEM_BAD_TYPE', 'Invalid redeem type.', 400);
  }
  return raw as RedeemType;
}

export function assertRedeemStatus(raw: string): RedeemCodeStatus {
  if (!STATUSES.has(raw)) {
    throw new AppError('REDEEM_BAD_STATUS', 'Invalid redeem status.', 400);
  }
  return raw as RedeemCodeStatus;
}

export function assertRedeemCadence(raw: string): RedeemCadence {
  if (!CADENCES.has(raw)) {
    throw new AppError('REDEEM_BAD_CADENCE', 'Invalid cadence.', 400);
  }
  return raw as RedeemCadence;
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
