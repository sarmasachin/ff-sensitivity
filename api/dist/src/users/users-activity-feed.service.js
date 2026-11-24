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
exports.UsersActivityFeedService = exports.ACTIVITY_FEED_EVENTS = void 0;
const common_1 = require("@nestjs/common");
const app_error_1 = require("../common/errors/app-error");
const prisma_service_1 = require("../prisma/prisma.service");
const users_security_1 = require("./users-security");
const DEFAULT_DAYS = 7;
const MAX_DAYS = 30;
const FEED_LIMIT = 80;
exports.ACTIVITY_FEED_EVENTS = [
    'app_open',
    'login',
    'redeem_claim',
    'scratch_roll',
    'logout',
];
const FEED_SET = new Set(exports.ACTIVITY_FEED_EVENTS);
let UsersActivityFeedService = class UsersActivityFeedService {
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
        const names = [...exports.ACTIVITY_FEED_EVENTS];
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
        const counts = {
            app_open: 0,
            login: 0,
            redeem_claim: 0,
            scratch_roll: 0,
            logout: 0,
        };
        for (const row of grouped) {
            if (FEED_SET.has(row.name)) {
                counts[row.name] = row._count._all;
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
                name: row.name,
                detail: detailFor(row.name, row.propsJson),
                at: row.createdAt.toISOString(),
            })),
        };
    }
};
exports.UsersActivityFeedService = UsersActivityFeedService;
exports.UsersActivityFeedService = UsersActivityFeedService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersActivityFeedService);
function clampDays(raw) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 1)
        return DEFAULT_DAYS;
    return Math.min(MAX_DAYS, Math.floor(n));
}
function detailFor(name, props) {
    if (props == null || typeof props !== 'object' || Array.isArray(props)) {
        return null;
    }
    const p = props;
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
//# sourceMappingURL=users-activity-feed.service.js.map