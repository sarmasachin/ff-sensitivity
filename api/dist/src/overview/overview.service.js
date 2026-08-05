"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverviewService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const analytics_service_1 = require("../analytics/analytics.service");
const overview_security_1 = require("./overview-security");
const overview_series_1 = require("./overview-series");
let OverviewService = class OverviewService {
    prisma;
    analytics;
    constructor(prisma, analytics) {
        this.prisma = prisma;
        this.analytics = analytics;
    }
    async adminSnapshot() {
        const now = new Date();
        const todayStart = (0, overview_security_1.startOfUtcDay)(now);
        const since7d = (0, overview_security_1.daysAgoUtc)(7, now);
        const activeSince = (0, overview_security_1.hoursAgoCutoff)(overview_security_1.STALE_HOURS, now);
        const pushSince = (0, overview_security_1.daysAgoUtc)(overview_security_1.PUSH_ACTIVE_DAYS, now);
        const [usersTotal, usersNewToday, usersNew7d, usersActive, usersRestricted, usersSuspended, usersLoggedIn7d, devicesTotal, devicesBlocked, devicesActive72h, devicesStale, pushActive7d, activeCodes, lowStock, claimsToday, scratchToday, walletAgg, pendingSupport, engagement, funnel, screenTime, suspectedUninstalls, registeredWithoutOpenEvent,] = await Promise.all([
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
                where: { status: client_1.RedeemCodeStatus.ACTIVE, stockLeft: { gt: 0 } },
            }),
            this.prisma.redeemCode.count({
                where: {
                    status: client_1.RedeemCodeStatus.ACTIVE,
                    stockLeft: { gt: 0, lte: overview_security_1.LOW_STOCK_MAX },
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
                        in: [client_1.SupportStatus.OPEN, client_1.SupportStatus.PENDING_REPLY],
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
                    dashboardUrl: 'https://console.firebase.google.com/project/ff-sesnitivity/crashlytics/app/android:com.ffsensitivity.app/issues',
                },
            },
            meta: {
                staleHours: overview_security_1.STALE_HOURS,
                pushActiveDays: overview_security_1.PUSH_ACTIVE_DAYS,
                lowStockMax: overview_security_1.LOW_STOCK_MAX,
                dayBasis: 'utc',
            },
            refreshedAt: now.toISOString(),
        };
    }
    async adminSeries(range) {
        return (0, overview_series_1.buildOverviewSeries)(this.prisma, range);
    }
    async countRegisteredWithoutOpenEvent() {
        const rows = await this.prisma.$queryRaw `
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
};
exports.OverviewService = OverviewService;
exports.OverviewService = OverviewService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        analytics_service_1.AnalyticsService])
], OverviewService);
//# sourceMappingURL=overview.service.js.map