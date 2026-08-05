import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma/prisma.service';
import {
  OPEN_EVENT_NAMES,
  assertClientEventName,
  assertEventName,
  optionalInstallId,
  sanitizeScreenSessionProps,
  sanitizeProps,
  SCREEN_SESSION_MAX_MS,
  type AllowedEventName,
} from './analytics-security';
import {
  daysAgoUtc,
  startOfUtcDay,
} from '../overview/overview-security';

// --- Start: App analytics P1 live wire (Sachin) ---
@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Never throw into product flows — analytics must not break redeem/scratch. */
  trackSafe(input: {
    name: AllowedEventName | string;
    userId?: string | null;
    installId?: string | null;
    props?: Record<string, unknown> | null;
  }) {
    void this.track(input).catch(() => undefined);
  }

  async track(input: {
    name: AllowedEventName | string;
    userId?: string | null;
    installId?: string | null;
    props?: Record<string, unknown> | null;
  }) {
    const name = assertEventName(String(input.name));
    const installId = optionalInstallId(input.installId ?? null);
    const userId =
      input.userId && /^[a-z0-9_-]{10,40}$/i.test(input.userId)
        ? input.userId
        : null;
    if (!installId && !userId) {
      return { ok: false as const };
    }
    const props = sanitizeProps(input.props ?? null);
    await this.prisma.appAnalyticsEvent.create({
      data: {
        name,
        installId,
        userId,
        propsJson: props === null ? Prisma.JsonNull : props,
      },
    });
    return { ok: true as const };
  }

  async trackFromUser(
    userId: string,
    raw: { name: string; installId?: string; props?: Record<string, unknown> },
  ) {
    const name = assertClientEventName(raw.name);
    if (name === 'screen_session') {
      const installId = optionalInstallId(raw.installId ?? null);
      if (!installId) {
        throw new AppError(
          'ANALYTICS_INSTALL_REQUIRED',
          'Screen session requires an install id.',
          400,
        );
      }
      const owned = await this.prisma.deviceInstall.findFirst({
        where: { installId, userId, blocked: false },
        select: { id: true },
      });
      if (!owned) {
        throw new AppError(
          'ANALYTICS_INSTALL_UNVERIFIED',
          'Install is not registered to this user.',
          403,
        );
      }
      return this.track({
        name,
        userId,
        installId,
        props: sanitizeScreenSessionProps(raw.props),
      });
    }
    return this.track({
      name,
      userId,
      installId: raw.installId,
      props: raw.props,
    });
  }

  async trackAnonOpen(installIdRaw: string, appVersion?: string) {
    const installId = optionalInstallId(installIdRaw);
    if (!installId) {
      return { ok: false as const };
    }
    return this.track({
      name: 'app_open',
      installId,
      props: appVersion ? { app_version: appVersion } : null,
    });
  }

  async engagementSnapshot(now = new Date()) {
    const todayStart = startOfUtcDay(now);
    const since30d = daysAgoUtc(30, now);
    const openNames = [...OPEN_EVENT_NAMES];

    const [eventsToday, topRaw, dauToday, mau30d, logoutToday] =
      await Promise.all([
        this.prisma.appAnalyticsEvent.count({
          where: { createdAt: { gte: todayStart } },
        }),
        this.prisma.appAnalyticsEvent.groupBy({
          by: ['name'],
          where: { createdAt: { gte: todayStart } },
          _count: { _all: true },
          orderBy: { _count: { name: 'desc' } },
          take: 8,
        }),
        this.countDistinctActors(openNames, todayStart),
        this.countDistinctActors(openNames, since30d),
        this.prisma.appAnalyticsEvent.count({
          where: { name: 'logout', createdAt: { gte: todayStart } },
        }),
      ]);

    return {
      dauToday,
      mau30d,
      eventsToday,
      topEvents: topRaw.map((r) => ({
        name: r.name,
        count: r._count._all,
      })),
      logoutToday,
    };
  }

  // --- Start: App analytics P2 funnel (Sachin) ---
  /** UTC-day funnel: new installs → first open → signup → first claim. */
  async funnelSnapshot(now = new Date()) {
    const todayStart = startOfUtcDay(now);

    const [installsToday, firstOpenToday, signupsToday, firstClaimsToday] =
      await Promise.all([
        this.prisma.deviceInstall.count({
          where: { createdAt: { gte: todayStart } },
        }),
        this.countFirstOpensToday(todayStart),
        this.prisma.user.count({
          where: { createdAt: { gte: todayStart } },
        }),
        this.countFirstClaimsToday(todayStart),
      ]);

    return {
      installsToday,
      firstOpenToday,
      signupsToday,
      firstClaimsToday,
    };
  }

  // --- Start: App analytics P3 screen time (Sachin) ---
  async screenTimeSnapshot(now = new Date()) {
    const todayStart = startOfUtcDay(now);
    const [summary] = await this.prisma.$queryRaw<
      Array<{
        total_ms: bigint;
        visits: bigint;
        actors: bigint;
      }>
    >`
      SELECT
        COALESCE(SUM(
          CASE
            WHEN props_json->>'duration_ms' ~ '^[0-9]+$'
            THEN LEAST((props_json->>'duration_ms')::bigint, ${SCREEN_SESSION_MAX_MS})
            ELSE 0
          END
        ), 0)::bigint AS total_ms,
        COUNT(*)::bigint AS visits,
        COUNT(DISTINCT COALESCE(install_id, user_id))::bigint AS actors
      FROM app_analytics_events
      WHERE name = 'screen_session'
        AND created_at >= ${todayStart}
    `;
    const top = await this.prisma.$queryRaw<
      Array<{
        screen: string;
        total_ms: bigint;
        visits: bigint;
      }>
    >`
      SELECT
        props_json->>'screen' AS screen,
        SUM(
          CASE
            WHEN props_json->>'duration_ms' ~ '^[0-9]+$'
            THEN LEAST((props_json->>'duration_ms')::bigint, ${SCREEN_SESSION_MAX_MS})
            ELSE 0
          END
        )::bigint AS total_ms,
        COUNT(*)::bigint AS visits
      FROM app_analytics_events
      WHERE name = 'screen_session'
        AND created_at >= ${todayStart}
        AND props_json->>'screen' ~ '^[a-z][a-z0-9_]{0,31}$'
      GROUP BY props_json->>'screen'
      ORDER BY total_ms DESC
      LIMIT 6
    `;
    const totalMs = Number(summary?.total_ms ?? 0);
    const visits = Number(summary?.visits ?? 0);
    return {
      trackedUsersToday: Number(summary?.actors ?? 0),
      screenVisitsToday: visits,
      screenTimeTodaySeconds: Math.round(totalMs / 1000),
      avgScreenSeconds: visits === 0 ? 0 : Math.round(totalMs / visits / 1000),
      topScreens: top.map((row) => ({
        screen: row.screen,
        seconds: Math.round(Number(row.total_ms) / 1000),
        visits: Number(row.visits),
      })),
    };
  }
  // --- End: App analytics P3 screen time (Sachin) ---

  /** Distinct install_ids whose earliest app_open fell in [todayStart, ∞). */
  private async countFirstOpensToday(todayStart: Date): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ c: bigint }>>`
      SELECT COUNT(*)::bigint AS c
      FROM (
        SELECT install_id
        FROM app_analytics_events
        WHERE name = 'app_open'
          AND install_id IS NOT NULL
        GROUP BY install_id
        HAVING MIN(created_at) >= ${todayStart}
      ) t
    `;
    return Number(rows[0]?.c ?? 0);
  }

  /** Users whose first redeem claim was created on/after todayStart. */
  private async countFirstClaimsToday(todayStart: Date): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ c: bigint }>>`
      SELECT COUNT(*)::bigint AS c
      FROM (
        SELECT user_id
        FROM redeem_claims
        GROUP BY user_id
        HAVING MIN(created_at) >= ${todayStart}
      ) t
    `;
    return Number(rows[0]?.c ?? 0);
  }
  // --- End: App analytics P2 funnel (Sachin) ---

  private async countDistinctActors(
    names: string[],
    since: Date,
  ): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ c: bigint }>>`
      SELECT COUNT(DISTINCT COALESCE(install_id, user_id))::bigint AS c
      FROM app_analytics_events
      WHERE created_at >= ${since}
        AND name IN (${Prisma.join(names)})
        AND COALESCE(install_id, user_id) IS NOT NULL
    `;
    return Number(rows[0]?.c ?? 0);
  }
}
// --- End: App analytics P1 live wire (Sachin) ---
