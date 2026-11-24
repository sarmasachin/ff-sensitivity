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
exports.UsersScreenJourneyService = void 0;
const common_1 = require("@nestjs/common");
const app_error_1 = require("../common/errors/app-error");
const prisma_service_1 = require("../prisma/prisma.service");
const analytics_security_1 = require("../analytics/analytics-security");
const users_security_1 = require("./users-security");
const DEFAULT_DAYS = 7;
const MAX_DAYS = 30;
const TIMELINE_LIMIT = 80;
let UsersScreenJourneyService = class UsersScreenJourneyService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async forUser(userIdRaw, daysRaw) {
        const userId = (0, users_security_1.assertUserId)(userIdRaw);
        const days = clampDays(daysRaw);
        const exists = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
        });
        if (!exists) {
            throw new app_error_1.AppError('USER_NOT_FOUND', 'User not found.', 404);
        }
        const now = new Date();
        const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        const [summaryRow, byScreen, timeline] = await Promise.all([
            this.prisma.$queryRaw `
        SELECT
          COALESCE(SUM(
            CASE
              WHEN props_json->>'duration_ms' ~ '^[0-9]+$'
              THEN LEAST((props_json->>'duration_ms')::bigint, ${analytics_security_1.SCREEN_SESSION_MAX_MS})
              ELSE 0
            END
          ), 0)::bigint AS total_ms,
          COUNT(*)::bigint AS visits,
          COUNT(DISTINCT props_json->>'screen')::bigint AS screens
        FROM app_analytics_events
        WHERE name = 'screen_session'
          AND user_id = ${userId}
          AND created_at >= ${since}
      `,
            this.prisma.$queryRaw `
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
          AND user_id = ${userId}
          AND created_at >= ${since}
          AND props_json->>'screen' ~ '^[a-z][a-z0-9_]{0,31}$'
        GROUP BY props_json->>'screen'
        ORDER BY total_ms DESC
        LIMIT 12
      `,
            this.prisma.$queryRaw `
        SELECT
          id,
          props_json->>'screen' AS screen,
          CASE
            WHEN props_json->>'duration_ms' ~ '^[0-9]+$'
            THEN LEAST((props_json->>'duration_ms')::bigint, ${analytics_security_1.SCREEN_SESSION_MAX_MS})
            ELSE 0
          END AS duration_ms,
          created_at
        FROM app_analytics_events
        WHERE name = 'screen_session'
          AND user_id = ${userId}
          AND created_at >= ${since}
          AND props_json->>'screen' ~ '^[a-z][a-z0-9_]{0,31}$'
        ORDER BY created_at DESC
        LIMIT ${TIMELINE_LIMIT}
      `,
        ]);
        const summary = summaryRow[0];
        const totalMs = Number(summary?.total_ms ?? 0);
        const visits = Number(summary?.visits ?? 0);
        return {
            days,
            since: since.toISOString(),
            summary: {
                visits,
                totalSeconds: Math.round(totalMs / 1000),
                uniqueScreens: Number(summary?.screens ?? 0),
            },
            byScreen: byScreen.map((row) => ({
                screen: row.screen,
                visits: Number(row.visits),
                seconds: Math.round(Number(row.total_ms) / 1000),
            })),
            timeline: timeline.map((row) => {
                const durationMs = Number(row.duration_ms);
                return {
                    id: row.id,
                    screen: row.screen,
                    durationMs,
                    seconds: Math.round(durationMs / 1000),
                    at: row.created_at.toISOString(),
                };
            }),
        };
    }
};
exports.UsersScreenJourneyService = UsersScreenJourneyService;
exports.UsersScreenJourneyService = UsersScreenJourneyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersScreenJourneyService);
function clampDays(raw) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 1)
        return DEFAULT_DAYS;
    return Math.min(MAX_DAYS, Math.floor(n));
}
//# sourceMappingURL=users-screen-journey.service.js.map