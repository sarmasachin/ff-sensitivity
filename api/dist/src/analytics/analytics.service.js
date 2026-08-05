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
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_error_1 = require("../common/errors/app-error");
const prisma_service_1 = require("../prisma/prisma.service");
const analytics_security_1 = require("./analytics-security");
const overview_security_1 = require("../overview/overview-security");
let AnalyticsService = class AnalyticsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    trackSafe(input) {
        void this.track(input).catch(() => undefined);
    }
    async track(input) {
        const name = (0, analytics_security_1.assertEventName)(String(input.name));
        const installId = (0, analytics_security_1.optionalInstallId)(input.installId ?? null);
        const userId = input.userId && /^[a-z0-9_-]{10,40}$/i.test(input.userId)
            ? input.userId
            : null;
        if (!installId && !userId) {
            return { ok: false };
        }
        const props = (0, analytics_security_1.sanitizeProps)(input.props ?? null);
        await this.prisma.appAnalyticsEvent.create({
            data: {
                name,
                installId,
                userId,
                propsJson: props === null ? client_1.Prisma.JsonNull : props,
            },
        });
        return { ok: true };
    }
    async trackFromUser(userId, raw) {
        const name = (0, analytics_security_1.assertClientEventName)(raw.name);
        if (name === 'screen_session') {
            const installId = (0, analytics_security_1.optionalInstallId)(raw.installId ?? null);
            if (!installId) {
                throw new app_error_1.AppError('ANALYTICS_INSTALL_REQUIRED', 'Screen session requires an install id.', 400);
            }
            const owned = await this.prisma.deviceInstall.findFirst({
                where: { installId, userId, blocked: false },
                select: { id: true },
            });
            if (!owned) {
                throw new app_error_1.AppError('ANALYTICS_INSTALL_UNVERIFIED', 'Install is not registered to this user.', 403);
            }
            return this.track({
                name,
                userId,
                installId,
                props: (0, analytics_security_1.sanitizeScreenSessionProps)(raw.props),
            });
        }
        return this.track({
            name,
            userId,
            installId: raw.installId,
            props: raw.props,
        });
    }
    async trackAnonOpen(installIdRaw, appVersion) {
        const installId = (0, analytics_security_1.optionalInstallId)(installIdRaw);
        if (!installId) {
            return { ok: false };
        }
        return this.track({
            name: 'app_open',
            installId,
            props: appVersion ? { app_version: appVersion } : null,
        });
    }
    async engagementSnapshot(now = new Date()) {
        const todayStart = (0, overview_security_1.startOfUtcDay)(now);
        const since30d = (0, overview_security_1.daysAgoUtc)(30, now);
        const openNames = [...analytics_security_1.OPEN_EVENT_NAMES];
        const [eventsToday, topRaw, dauToday, mau30d, logoutToday] = await Promise.all([
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
    async funnelSnapshot(now = new Date()) {
        const todayStart = (0, overview_security_1.startOfUtcDay)(now);
        const [installsToday, firstOpenToday, signupsToday, firstClaimsToday] = await Promise.all([
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
    async screenTimeSnapshot(now = new Date()) {
        const todayStart = (0, overview_security_1.startOfUtcDay)(now);
        const [summary] = await this.prisma.$queryRaw `
      SELECT
        COALESCE(SUM(
          CASE
            WHEN props_json->>'duration_ms' ~ '^[0-9]+$'
            THEN LEAST((props_json->>'duration_ms')::bigint, ${analytics_security_1.SCREEN_SESSION_MAX_MS})
            ELSE 0
          END
        ), 0)::bigint AS total_ms,
        COUNT(*)::bigint AS visits,
        COUNT(DISTINCT COALESCE(install_id, user_id))::bigint AS actors
      FROM app_analytics_events
      WHERE name = 'screen_session'
        AND created_at >= ${todayStart}
    `;
        const top = await this.prisma.$queryRaw `
      SELECT
        props_json->>'screen' AS screen,
        SUM(
          CASE
            WHEN props_json->>'duration_ms' ~ '^[0-9]+$'
            THEN LEAST((props_json->>'duration_ms')::bigint, ${analytics_security_1.SCREEN_SESSION_MAX_MS})
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
    async countFirstOpensToday(todayStart) {
        const rows = await this.prisma.$queryRaw `
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
    async countFirstClaimsToday(todayStart) {
        const rows = await this.prisma.$queryRaw `
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
    async countDistinctActors(names, since) {
        const rows = await this.prisma.$queryRaw `
      SELECT COUNT(DISTINCT COALESCE(install_id, user_id))::bigint AS c
      FROM app_analytics_events
      WHERE created_at >= ${since}
        AND name IN (${client_1.Prisma.join(names)})
        AND COALESCE(install_id, user_id) IS NOT NULL
    `;
        return Number(rows[0]?.c ?? 0);
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map