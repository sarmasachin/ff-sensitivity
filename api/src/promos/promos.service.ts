import { Injectable } from '@nestjs/common';
import { Prisma, PromoPlacement } from '@prisma/client';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma/prisma.service';
import type { PromoDto, SavePromosDto } from './dto/promos.dto';

// --- Start: Promos live wire (Sachin) ---
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

function stamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseStamp(raw: string): Date {
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

function sanitizeText(raw: string, max: number): string {
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

function assertSafeDeepLink(raw: string): string {
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
    throw new AppError('PROMOS_BAD_LINK', 'Deep link must not include credentials.', 400);
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

function assertPromos(rows: PromoDto[]) {
  const ids = new Set<string>();
  for (const row of rows) {
    if (ids.has(row.id)) {
      throw new AppError('PROMOS_DUP_ID', `Duplicate promo id “${row.id}”.`, 400);
    }
    ids.add(row.id);
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
}

@Injectable()
export class PromosService {
  constructor(private readonly prisma: PrismaService) {}

  private toRow(p: {
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

  async adminList() {
    const rows = await this.prisma.promo.findMany({
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    });
    return { promos: rows.map((r) => this.toRow(r)) };
  }

  async adminSave(adminId: string, dto: SavePromosDto) {
    assertPromos(dto.promos);

    const normalized = dto.promos
      .map((row) => ({
        id: row.id,
        title: sanitizeText(row.title, 80),
        subtitle: sanitizeText(row.subtitle, 160),
        imageLabel: sanitizeText(row.imageLabel, 64).toLowerCase() || 'untitled',
        deepLink: assertSafeDeepLink(row.deepLink),
        placement: row.placement as PromoPlacement,
        sortOrder: row.sortOrder,
        enabled: row.enabled,
        startsAt: parseStamp(row.startsAt),
        endsAt: parseStamp(row.endsAt),
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
      .map((row, i) => ({ ...row, sortOrder: i + 1 }));

    await this.prisma.$transaction(async (tx) => {
      await tx.promo.deleteMany({});
      if (normalized.length > 0) {
        await tx.promo.createMany({ data: normalized });
      }
      await tx.auditLog.create({
        data: {
          actorAdminId: adminId,
          action: 'promos.save',
          entity: 'promos:catalog',
          afterJson: { count: normalized.length } as Prisma.InputJsonValue,
        },
      });
    });

    return this.adminList();
  }

  /** Public live set — enabled + inside schedule window (server time). */
  async liveCatalog() {
    const now = new Date();
    const rows = await this.prisma.promo.findMany({
      where: {
        enabled: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      take: 40,
    });
    return {
      promos: rows.map((r) => ({
        id: r.id,
        title: r.title,
        subtitle: r.subtitle,
        imageLabel: r.imageLabel,
        deepLink: r.deepLink,
        placement: r.placement,
        sortOrder: r.sortOrder,
      })),
    };
  }
}
// --- End: Promos live wire (Sachin) ---
