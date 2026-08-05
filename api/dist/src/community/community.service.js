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
exports.CommunityService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const app_error_1 = require("../common/errors/app-error");
const URLISH = /https?:\/\/|www\.|\.(com|net|org|in)\b/i;
const MAX_PENDING_PER_USER = 3;
const FEED_LIMIT = 50;
let CommunityService = class CommunityService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async feed() {
        const rows = await this.prisma.communityPost.findMany({
            where: {
                status: {
                    in: [client_1.CommunityPostStatus.APPROVED, client_1.CommunityPostStatus.FEATURED],
                },
            },
            orderBy: [{ status: 'desc' }, { createdAt: 'desc' }],
            take: FEED_LIMIT,
        });
        const featured = rows.filter((r) => r.status === client_1.CommunityPostStatus.FEATURED);
        const approved = rows.filter((r) => r.status === client_1.CommunityPostStatus.APPROVED);
        return [...featured, ...approved].map((r) => this.toPublicCard(r));
    }
    async submit(userId, dto) {
        this.assertCleanText(dto.name, 'name');
        this.assertCleanText(dto.deviceLabel, 'deviceLabel');
        if (dto.deviceMeta)
            this.assertCleanText(dto.deviceMeta, 'deviceMeta');
        const pendingCount = await this.prisma.communityPost.count({
            where: { userId, status: client_1.CommunityPostStatus.PENDING },
        });
        if (pendingCount >= MAX_PENDING_PER_USER) {
            throw new app_error_1.AppError('COMMUNITY_PENDING_LIMIT', `You already have ${MAX_PENDING_PER_USER} posts waiting for review.`, 429);
        }
        const post = await this.prisma.communityPost.create({
            data: {
                userId,
                name: dto.name.trim(),
                freeFireId: dto.freeFireId.trim(),
                rank: dto.rank,
                role: dto.role,
                deviceLabel: dto.deviceLabel.trim(),
                deviceMeta: (dto.deviceMeta ?? '').trim(),
                matches: dto.matches,
                kills: dto.kills,
                headshots: dto.headshots,
                general: dto.general,
                redDot: dto.redDot,
                scope2x: dto.scope2x,
                scope4x: dto.scope4x,
                awm: dto.awm,
                freeLook: dto.freeLook,
                status: client_1.CommunityPostStatus.PENDING,
            },
        });
        return {
            id: post.id,
            status: post.status,
            message: 'Submitted for review. It will appear in Community after approval.',
        };
    }
    async report(userId, postId) {
        const post = await this.prisma.communityPost.findUnique({
            where: { id: postId },
        });
        if (!post) {
            throw new app_error_1.AppError('COMMUNITY_NOT_FOUND', 'Post not found.', 404);
        }
        if (post.userId === userId) {
            throw new app_error_1.AppError('COMMUNITY_REPORT_OWN', 'You cannot report your own post.', 400);
        }
        if (post.status !== client_1.CommunityPostStatus.APPROVED &&
            post.status !== client_1.CommunityPostStatus.FEATURED) {
            throw new app_error_1.AppError('COMMUNITY_REPORT_STATUS', 'Only live posts can be reported.', 400);
        }
        try {
            await this.prisma.$transaction([
                this.prisma.communityPostReport.create({
                    data: { postId, userId },
                }),
                this.prisma.communityPost.update({
                    where: { id: postId },
                    data: { reports: { increment: 1 } },
                }),
            ]);
        }
        catch (err) {
            if (err instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                err.code === 'P2002') {
                throw new app_error_1.AppError('COMMUNITY_ALREADY_REPORTED', 'You already reported this post.', 409);
            }
            throw err;
        }
        return { ok: true };
    }
    async adminList(query, status) {
        const where = {};
        if (status &&
            Object.values(client_1.CommunityPostStatus).includes(status)) {
            where.status = status;
        }
        const q = query?.trim();
        if (q) {
            where.OR = [
                { name: { contains: q, mode: 'insensitive' } },
                { freeFireId: { contains: q } },
                { deviceLabel: { contains: q, mode: 'insensitive' } },
                { rank: { contains: q, mode: 'insensitive' } },
                { role: { contains: q, mode: 'insensitive' } },
            ];
        }
        const rows = await this.prisma.communityPost.findMany({
            where,
            orderBy: [{ createdAt: 'desc' }],
            take: 200,
        });
        return rows.map((r) => this.toAdminRow(r));
    }
    async adminStats() {
        const [pending, approved, featured, hidden, flagged] = await Promise.all([
            this.prisma.communityPost.count({
                where: { status: client_1.CommunityPostStatus.PENDING },
            }),
            this.prisma.communityPost.count({
                where: { status: client_1.CommunityPostStatus.APPROVED },
            }),
            this.prisma.communityPost.count({
                where: { status: client_1.CommunityPostStatus.FEATURED },
            }),
            this.prisma.communityPost.count({
                where: { status: client_1.CommunityPostStatus.HIDDEN },
            }),
            this.prisma.communityPost.count({
                where: {
                    OR: [
                        { reports: { gt: 0 } },
                        { status: client_1.CommunityPostStatus.HIDDEN },
                    ],
                },
            }),
        ]);
        return {
            pending,
            live: approved + featured,
            featured,
            flagged,
            hidden,
        };
    }
    async adminSetStatus(adminId, postId, status) {
        const before = await this.prisma.communityPost.findUnique({
            where: { id: postId },
        });
        if (!before) {
            throw new app_error_1.AppError('COMMUNITY_NOT_FOUND', 'Post not found.', 404);
        }
        const after = await this.prisma.communityPost.update({
            where: { id: postId },
            data: { status },
        });
        await this.prisma.auditLog.create({
            data: {
                actorAdminId: adminId,
                action: `community.status.${status.toLowerCase()}`,
                entity: `community_post:${postId}`,
                beforeJson: { status: before.status },
                afterJson: { status: after.status },
            },
        });
        return this.toAdminRow(after);
    }
    assertCleanText(value, field) {
        if (URLISH.test(value)) {
            throw new app_error_1.AppError('COMMUNITY_INVALID_TEXT', `${field} cannot contain links.`, 400);
        }
    }
    toPublicCard(row) {
        return {
            id: row.id,
            name: row.name,
            freeFireId: row.freeFireId,
            rank: row.rank,
            role: row.role,
            deviceLabel: row.deviceLabel,
            deviceMeta: row.deviceMeta,
            matches: row.matches,
            kills: row.kills,
            headshots: row.headshots,
            general: row.general,
            redDot: row.redDot,
            scope2x: row.scope2x,
            scope4x: row.scope4x,
            awm: row.awm,
            freeLook: row.freeLook,
            featured: row.status === client_1.CommunityPostStatus.FEATURED,
        };
    }
    toAdminRow(row) {
        return {
            id: row.id,
            name: row.name,
            freeFireId: row.freeFireId,
            rank: row.rank,
            role: row.role,
            deviceLabel: row.deviceLabel,
            deviceMeta: row.deviceMeta,
            matches: row.matches,
            kills: row.kills,
            headshots: row.headshots,
            general: row.general,
            redDot: row.redDot,
            scope2x: row.scope2x,
            scope4x: row.scope4x,
            awm: row.awm,
            freeLook: row.freeLook,
            status: row.status,
            reports: row.reports,
            createdAt: row.createdAt.toISOString(),
            submittedLabel: relativeLabel(row.createdAt),
        };
    }
};
exports.CommunityService = CommunityService;
exports.CommunityService = CommunityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CommunityService);
function relativeLabel(date) {
    const ms = Date.now() - date.getTime();
    const min = Math.floor(ms / 60_000);
    if (min < 1)
        return 'just now';
    if (min < 60)
        return `${min} min ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24)
        return `${hr}h ago`;
    const days = Math.floor(hr / 24);
    if (days < 7)
        return `${days} day${days === 1 ? '' : 's'} ago`;
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
}
//# sourceMappingURL=community.service.js.map