import { Injectable } from '@nestjs/common';
import {
  RedeemCodeStatus,
  SupportStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import {
  LOW_STOCK_MAX,
  PUSH_ACTIVE_DAYS,
  STALE_HOURS,
  daysAgoUtc,
  hoursAgoCutoff,
  startOfUtcDay,
} from './overview-security';
import {
  buildOverviewSeries,
  type OverviewSeriesRange,
} from './overview-series';

// --- Start: Overview KPIs live wire (Sachin) ---
@Injectable()
export class OverviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
  ) {}

  async adminSnapshot() {
    const now = new Date();
    const todayStart = startOfUtcDay(now);
    const since7d = daysAgoUtc(7, now);
    const activeSince = hoursAgoCutoff(STALE_HOURS, now);
    const pushSince = daysAgoUtc(PUSH_ACTIVE_DAYS, now);

    const [
      usersTotal,
      usersNewToday,
      usersNew7d,
      usersActive,
      usersRestricted,
      usersSuspended,
      usersLoggedIn7d,
      devicesTotal,
      devicesBlocked,
      devicesActive72h,
      devicesStale,
      pushActive7d,
      activeCodes,
      lowStock,
      claimsToday,
      scratchToday,
      walletAgg,
      pendingSupport,
      engagement,
      funnel,
      screenTime,
      suspectedUninstalls,
      registeredWithoutOpenEvent,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.user.count({ where: { createdAt: { gte: since7d } } }),
      this.prisma.user.count({
        where: { isActive: true, isRestricted: false },
      }),
      this.prisma.user.count({
        where: { isActive: true, isRestricted: true },
      }),
      this.prisma.user.count({ where: { isActive: false } }),
      this.prisma.user.count({
        where: { lastLoginAt: { gte: since7d } },
      }),
      this.prisma.deviceInstall.count(),
      this.prisma.deviceInstall.count({ where: { blocked: true } }),
      this.prisma.deviceInstall.count({
        where: { blocked: false, lastSeenAt: { gte: activeSince } },
      }),
      this.prisma.deviceInstall.count({
        where: { blocked: false, lastSeenAt: { lt: activeSince } },
      }),
      this.prisma.devicePushToken.count({
        where: { pushEnabled: true, lastSeenAt: { gte: pushSince } },
      }),
      this.prisma.redeemCode.count({
        where: { status: RedeemCodeStatus.ACTIVE, stockLeft: { gt: 0 } },
      }),
      this.prisma.redeemCode.count({
        where: {
          status: RedeemCodeStatus.ACTIVE,
          stockLeft: { gt: 0, lte: LOW_STOCK_MAX },
        },
      }),
      this.prisma.redeemClaim.count({
        where: { createdAt: { gte: todayStart } },
      }),
      this.prisma.scratchRoll.count({
        where: { createdAt: { gte: todayStart } },
      }),
      this.prisma.walletLedger.aggregate({
        where: {
          createdAt: { gte: todayStart },
          OR: [
            { reason: { startsWith: 'staff:grant' } },
            { reason: { startsWith: 'staff:revoke' } },
          ],
        },
        _sum: { delta: true },
      }),
      this.prisma.supportThread.count({
        where: {
          status: {
            in: [SupportStatus.OPEN, SupportStatus.PENDING_REPLY],
          },
        },
      }),
      this.analytics.engagementSnapshot(now),
      this.analytics.funnelSnapshot(now),
      this.analytics.screenTimeSnapshot(now),
      this.prisma.deviceInstall.count({
        where: { uninstallSuspectedAt: { not: null } },
      }),
      this.countRegisteredWithoutOpenEvent(),
    ]);

    return {
      users: {
        total: usersTotal,
        newToday: usersNewToday,
        new7d: usersNew7d,
        active: usersActive,
        restricted: usersRestricted,
        suspended: usersSuspended,
        loggedIn7d: usersLoggedIn7d,
      },
      devices: {
        total: devicesTotal,
        active72h: devicesActive72h,
        stale: devicesStale,
        blocked: devicesBlocked,
        pushActive7d,
      },
      redeem: {
        activeCodes,
        lowStock,
      },
      today: {
        claims: claimsToday,
        scratch: scratchToday,
        walletNet: walletAgg._sum.delta ?? 0,
        pendingSupport,
      },
      engagement,
      funnel,
      p3: {
        screenTime,
        installHealth: {
          suspectedUninstalls,
          registeredWithoutOpenEvent,
          stale72h: devicesStale,
        },
        crashReporting: {
          provider: 'firebase_crashlytics',
          liveKpiAvailable: false,
          dashboardUrl:
            'https://console.firebase.google.com/project/ff-sesnitivity/crashlytics/app/android:com.ffsensitivity.app/issues',
        },
      },
      meta: {
        staleHours: STALE_HOURS,
        pushActiveDays: PUSH_ACTIVE_DAYS,
        lowStockMax: LOW_STOCK_MAX,
        dayBasis: 'utc',
      },
      refreshedAt: now.toISOString(),
    };
  }

  async adminSeries(range: OverviewSeriesRange) {
    return buildOverviewSeries(this.prisma, range);
  }

  private async countRegisteredWithoutOpenEvent(): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ c: bigint }>>`
      SELECT COUNT(*)::bigint AS c
      FROM device_installs d
      WHERE NOT EXISTS (
        SELECT 1
        FROM app_analytics_events e
        WHERE e.install_id = d.install_id
          AND e.name IN ('app_open', 'home_open')
      )
    `;
    return Number(rows[0]?.c ?? 0);
  }
}
// --- End: Overview KPIs live wire (Sachin) ---
