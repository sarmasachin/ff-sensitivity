import { AppError } from '../common/errors/app-error';

const ID_RE = /^[a-z0-9_]{2,64}$/;
const CAT_RE = /^[A-Z][A-Z0-9_]{1,31}$/;

export function assertShopItemId(raw: string): string {
  const id = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (!ID_RE.test(id)) {
    throw new AppError(
      'SHOP_BAD_ID',
      'ID must use lowercase letters, numbers, and underscores (2–64).',
      400,
    );
  }
  return id;
}

export function assertCategoryId(raw: unknown): string {
  const id = String(raw ?? '')
    .trim()
    .toUpperCase();
  if (!CAT_RE.test(id)) {
    throw new AppError(
      'SHOP_BAD_CATEGORY',
      'Category id must be UPPER_SNAKE (2–32), e.g. PRIZE or SPECIAL.',
      400,
    );
  }
  return id;
}

export function sanitizeShopText(raw: unknown, max: number): string {
  const text = String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length > max) {
    throw new AppError(
      'SHOP_BAD_TEXT',
      `Text must be at most ${max} characters.`,
      400,
    );
  }
  return text;
}

export function assertPriceCoins(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 999999) {
    throw new AppError(
      'SHOP_BAD_PRICE',
      'Price must be a whole number from 1 to 999999.',
      400,
    );
  }
  return n;
}

export function assertStockLimit(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 999999) {
    throw new AppError(
      'SHOP_BAD_STOCK',
      'Stock limit must be empty (unlimited) or 0–999999.',
      400,
    );
  }
  return n;
}

export function assertSortOrder(raw: unknown, fallback = 0): number {
  if (raw === null || raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 9999) {
    throw new AppError('SHOP_BAD_SORT', 'Sort order must be 0–9999.', 400);
  }
  return n;
}
