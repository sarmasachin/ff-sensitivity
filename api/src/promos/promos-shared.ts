import { Prisma, PromoPlacement } from '@prisma/client';
import { AppError } from '../common/errors/app-error';
import type { PrismaService } from '../prisma/prisma.service';
import type { PromoDto } from './dto/promos.dto';

export const MAX_PROMOS = 40;

const ALLOWED_DEEP_PATHS = new Set([
  'home',
  'challenge',
  'daily_challenge',
  'scratch',
  'shop',
  'coin_shop',
  'redeem',
  'names',
  'stylish',
]);

export function stamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function parseStamp(raw: string): Date {
  const m = raw
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (!m) {
    throw new AppError('PROMOS_BAD_STAMP', 'Invalid schedule stamp.', 400);
  }
  const [, y, mo, d, h, mi] = m;
  const dt = new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    0,
    0,
  );
  if (!Number.isFinite(dt.getTime())) {
    throw new AppError('PROMOS_BAD_STAMP', 'Invalid schedule stamp.', 400);
  }
  return dt;
}

export function sanitizeText(raw: string, max: number): string {
  return [...raw]
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      if (code < 0x20 || code === 0x7f) return false;
      if (code >= 0x200b && code <= 0x200f) return false;
      if (code === 0xfeff) return false;
      return true;
    })
    .join('')
    .trim()
    .slice(0, max);
}

export function sanitizePromoId(raw: string): string {
  const id = (raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 64);
  if (!id || id.includes('/')) {
    throw new AppError('PROMOS_BAD_ID', 'Invalid promo id.', 400);
  }
  return id;
}

export function assertSafeDeepLink(raw: string): string {
  const link = sanitizeText(raw, 120).toLowerCase();
  let parsed: URL;
  try {
    parsed = new URL(link);
  } catch {
    throw new AppError('PROMOS_BAD_LINK', 'Deep link is invalid.', 400);
  }
  if (parsed.protocol !== 'ffops:') {
    throw new AppError(
      'PROMOS_BAD_LINK',
      'Deep link must use the ffops:// scheme.',
      400,
    );
  }
  if (parsed.username || parsed.password) {
    throw new AppError(
      'PROMOS_BAD_LINK',
      'Deep link must not include credentials.',
      400,
    );
  }
  const path = (parsed.hostname || parsed.pathname.replace(/^\//, ''))
    .split('/')[0]
    ?.replace(/[^a-z0-9_]/g, '');
  if (!path || !ALLOWED_DEEP_PATHS.has(path)) {
    throw new AppError(
      'PROMOS_BAD_LINK',
      'Deep link path is not allowlisted.',
      400,
    );
  }
  return `ffops://${path}`;
}

export function assertPromo(row: PromoDto) {
  const title = sanitizeText(row.title, 80);
  if (!title) {
    throw new AppError('PROMOS_VALIDATION', 'Title is required.', 400);
  }
  const start = parseStamp(row.startsAt);
  const end = parseStamp(row.endsAt);
  if (end.getTime() <= start.getTime()) {
    throw new AppError(
      'PROMOS_BAD_WINDOW',
      `Promo “${row.id}” end must be after start.`,
      400,
    );
  }
  assertSafeDeepLink(row.deepLink);
}

export function assertPromos(rows: PromoDto[]) {
  const ids = new Set<string>();
  for (const row of rows) {
    if (ids.has(row.id)) {
      throw new AppError(
        'PROMOS_DUP_ID',
        `Duplicate promo id “${row.id}”.`,
        400,
      );
    }
    ids.add(row.id);
    assertPromo(row);
  }
}

export function promoWriteData(row: PromoDto) {
  assertPromo(row);
  return {
    id: sanitizePromoId(row.id),
    title: sanitizeText(row.title, 80),
    subtitle: sanitizeText(row.subtitle, 160),
    imageLabel: sanitizeText(row.imageLabel, 64).toLowerCase() || 'untitled',
    deepLink: assertSafeDeepLink(row.deepLink),
    placement: row.placement as PromoPlacement,
    sortOrder: row.sortOrder,
    enabled: row.enabled,
    startsAt: parseStamp(row.startsAt),
    endsAt: parseStamp(row.endsAt),
  };
}

export function toPromoRow(p: {
  id: string;
  title: string;
  subtitle: string;
  imageLabel: string;
  deepLink: string;
  placement: PromoPlacement;
  sortOrder: number;
  enabled: boolean;
  startsAt: Date;
  endsAt: Date;
  updatedAt: Date;
}) {
  return {
    id: p.id,
    title: p.title,
    subtitle: p.subtitle,
    imageLabel: p.imageLabel,
    deepLink: p.deepLink,
    placement: p.placement,
    sortOrder: p.sortOrder,
    enabled: p.enabled,
    startsAt: stamp(p.startsAt),
    endsAt: stamp(p.endsAt),
    updatedAt: stamp(p.updatedAt),
  };
}

export function rethrowUnique(
  e: unknown,
  code: string,
  message: string,
): never {
  if (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === 'P2002'
  ) {
    throw new AppError(code, message, 409);
  }
  throw e;
}

export async function auditPromos(
  prisma: PrismaService,
  adminId: string,
  action: string,
  entity: string,
  after?: Record<string, unknown>,
) {
  await prisma.auditLog.create({
    data: {
      actorAdminId: adminId,
      action,
      entity,
      afterJson: (after ?? {}) as Prisma.InputJsonValue,
    },
  });
}

export async function compactPromoOrders(
  tx: Prisma.TransactionClient | PrismaService,
) {
  const rows = await tx.promo.findMany({
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    select: { id: true, sortOrder: true },
  });
  for (let i = 0; i < rows.length; i++) {
    const next = i + 1;
    if (rows[i].sortOrder !== next) {
      await tx.promo.update({
        where: { id: rows[i].id },
        data: { sortOrder: next },
      });
    }
  }
}
