import { Injectable } from '@nestjs/common';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma/prisma.service';
import { assertUserId } from './users-security';

const DEFAULT_DAYS = 7;
const MAX_DAYS = 30;
const FEED_LIMIT = 80;

/** Ops activity feed — only these names (matches product ask). */
export const ACTIVITY_FEED_EVENTS = [
  'app_open',
  'login',
  'redeem_claim',
  'scratch_roll',
  'logout',
] as const;

export type ActivityFeedEventName = (typeof ACTIVITY_FEED_EVENTS)[number];

const FEED_SET = new Set<string>(ACTIVITY_FEED_EVENTS);

// --- Start: Users activity feed 7d (Sachin) ---
@Injectable()
export class UsersActivityFeedService {
  constructor(private readonly prisma: PrismaService) {}

  async forUser(userIdRaw: string, daysRaw?: string) {
    const userId = assertUserId(userIdRaw);
    const days = clampDays(daysRaw);
    const exists = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!exists) {
      throw new AppError('USER_NOT_FOUND', 'User not found.', 404);
    }

    const now = new Date();
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const names = [...ACTIVITY_FEED_EVENTS];

    const [grouped, rows] = await Promise.all([
      this.prisma.appAnalyticsEvent.groupBy({
        by: ['name'],
        where: {
          userId,
          createdAt: { gte: since },
          name: { in: names },
        },
        _count: { _all: true },
      }),
      this.prisma.appAnalyticsEvent.findMany({
        where: {
          userId,
          createdAt: { gte: since },
          name: { in: names },
        },
        orderBy: { createdAt: 'desc' },
        take: FEED_LIMIT,
        select: {
          id: true,
          name: true,
          propsJson: true,
          createdAt: true,
        },
      }),
    ]);

    const counts: Record<ActivityFeedEventName, number> = {
      app_open: 0,
      login: 0,
      redeem_claim: 0,
      scratch_roll: 0,
      logout: 0,
    };
    for (const row of grouped) {
      if (FEED_SET.has(row.name)) {
        counts[row.name as ActivityFeedEventName] = row._count._all;
      }
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    return {
      days,
      since: since.toISOString(),
      summary: {
        total,
        counts,
      },
      items: rows.map((row) => ({
        id: row.id,
        name: row.name as ActivityFeedEventName,
        detail: detailFor(row.name, row.propsJson),
        at: row.createdAt.toISOString(),
      })),
    };
  }
}

function clampDays(raw?: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_DAYS;
  return Math.min(MAX_DAYS, Math.floor(n));
}

function detailFor(name: string, props: unknown): string | null {
  if (props == null || typeof props !== 'object' || Array.isArray(props)) {
    return null;
  }
  const p = props as Record<string, unknown>;
  if (name === 'redeem_claim' && typeof p.redeem_id === 'string') {
    return p.redeem_id.slice(0, 40);
  }
  if (name === 'scratch_roll' && typeof p.outcome === 'string') {
    return p.outcome.slice(0, 40);
  }
  if (name === 'app_open' && typeof p.app_version === 'string') {
    return `v${p.app_version}`.slice(0, 40);
  }
  return null;
}
// --- End: Users activity feed 7d (Sachin) ---
