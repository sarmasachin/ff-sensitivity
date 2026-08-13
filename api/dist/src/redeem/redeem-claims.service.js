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
exports.RedeemClaimsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const app_error_1 = require("../common/errors/app-error");
const settings_service_1 = require("../settings/settings.service");
const redeem_mask_1 = require("./redeem-mask");
const redeem_labels_1 = require("./redeem-labels");
let RedeemClaimsService = class RedeemClaimsService {
    prisma;
    settings;
    constructor(prisma, settings) {
        this.prisma = prisma;
        this.settings = settings;
    }
    async myClaims(userId) {
        const rows = await this.prisma.redeemClaim.findMany({
            where: { userId },
            include: {
                redeemCode: {
                    select: {
                        id: true,
                        title: true,
                        valueLabel: true,
                        type: true,
                        redeemUrl: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
        return rows.map((r) => ({
            id: r.id,
            redeemCodeId: r.redeemCodeId,
            title: r.redeemCode.title,
            valueLabel: r.redeemCode.valueLabel,
            type: r.redeemCode.type,
            redeemUrl: r.redeemCode.redeemUrl,
            codeMasked: (0, redeem_mask_1.maskRedeemCode)(r.codeSecret),
            code: r.codeSecret,
            flagged: r.flagged,
            createdAt: r.createdAt.toISOString(),
            whenLabel: (0, redeem_labels_1.relativeRedeemLabel)(r.createdAt),
        }));
    }
    async adminListClaims(query) {
        const q = query?.trim();
        const where = q
            ? {
                OR: [
                    { redeemCode: { title: { contains: q, mode: 'insensitive' } } },
                    { user: { email: { contains: q, mode: 'insensitive' } } },
                    { user: { displayName: { contains: q, mode: 'insensitive' } } },
                    { redeemCodeId: { contains: q } },
                    { id: { contains: q } },
                ],
            }
            : {};
        const rows = await this.prisma.redeemClaim.findMany({
            where,
            include: {
                user: { select: { id: true, email: true, displayName: true } },
                redeemCode: {
                    select: { id: true, title: true, stockLeft: true, valueLabel: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 300,
        });
        const userIds = [...new Set(rows.map((r) => r.userId))];
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentCounts = await this.prisma.redeemClaim.groupBy({
            by: ['userId'],
            where: { userId: { in: userIds }, createdAt: { gte: dayAgo } },
            _count: { _all: true },
        });
        const recentMap = new Map(recentCounts.map((c) => [c.userId, c._count._all]));
        return rows.map((r) => this.toAdminClaimRow(r, recentMap.get(r.userId) ?? 1));
    }
    async adminClaimsStats() {
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [copied, flagged, distinctUsers, recentByUser] = await Promise.all([
            this.prisma.redeemClaim.count({ where: { flagged: false } }),
            this.prisma.redeemClaim.count({ where: { flagged: true } }),
            this.prisma.redeemClaim
                .findMany({ select: { userId: true }, distinct: ['userId'] })
                .then((r) => r.length),
            this.prisma.redeemClaim.groupBy({
                by: ['userId'],
                where: { createdAt: { gte: dayAgo } },
                _count: { _all: true },
            }),
        ]);
        const highAbuse = recentByUser.filter((u) => u._count._all >= 4).length;
        return {
            copied,
            blocked: 0,
            flagged: flagged + highAbuse,
            devices: distinctUsers,
        };
    }
    async adminFlagClaim(adminId, claimId, flagged, note) {
        this.assertClaimId(claimId);
        const before = await this.prisma.redeemClaim.findUnique({
            where: { id: claimId },
        });
        if (!before) {
            throw new app_error_1.AppError('CLAIM_NOT_FOUND', 'Claim not found.', 404);
        }
        const after = await this.prisma.redeemClaim.update({
            where: { id: claimId },
            data: {
                flagged,
                adminNote: note?.trim()
                    ? note.trim().slice(0, 280)
                    : flagged
                        ? 'Manually flagged by staff.'
                        : 'Cleared by staff after review.',
            },
            include: {
                user: { select: { id: true, email: true, displayName: true } },
                redeemCode: {
                    select: { id: true, title: true, stockLeft: true, valueLabel: true },
                },
            },
        });
        await this.prisma.auditLog.create({
            data: {
                actorAdminId: adminId,
                action: flagged ? 'claims.flag' : 'claims.clear',
                entity: `redeem_claim:${claimId}`,
                beforeJson: { flagged: before.flagged },
                afterJson: { flagged: after.flagged },
            },
        });
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recent = await this.prisma.redeemClaim.count({
            where: { userId: after.userId, createdAt: { gte: dayAgo } },
        });
        return this.toAdminClaimRow(after, Math.max(1, recent));
    }
    async adminDeleteClaim(adminId, claimId) {
        this.assertClaimId(claimId);
        const before = await this.prisma.redeemClaim.findUnique({
            where: { id: claimId },
            include: {
                redeemCode: { select: { title: true } },
                user: { select: { email: true } },
            },
        });
        if (!before) {
            throw new app_error_1.AppError('CLAIM_NOT_FOUND', 'Claim not found.', 404);
        }
        await this.prisma.redeemClaim.delete({ where: { id: claimId } });
        await this.prisma.auditLog.create({
            data: {
                actorAdminId: adminId,
                action: 'claims.delete',
                entity: `redeem_claim:${claimId}`,
                beforeJson: {
                    userEmail: before.user.email,
                    title: before.redeemCode.title,
                    redeemCodeId: before.redeemCodeId,
                },
                afterJson: { deleted: true, stockRestored: false },
            },
        });
        return { ok: true };
    }
    async adminRevealClaim(adminId, claimId, currentPassword) {
        this.assertClaimId(claimId);
        await this.settings.assertStepUp(adminId, currentPassword, 'reveal');
        const row = await this.prisma.redeemClaim.findUnique({
            where: { id: claimId },
            include: {
                redeemCode: { select: { title: true } },
                user: { select: { email: true } },
            },
        });
        if (!row) {
            throw new app_error_1.AppError('CLAIM_NOT_FOUND', 'Claim not found.', 404);
        }
        await this.prisma.auditLog.create({
            data: {
                actorAdminId: adminId,
                action: 'claims.reveal',
                entity: `redeem_claim:${claimId}`,
                afterJson: {
                    title: row.redeemCode.title,
                    userEmail: row.user.email,
                },
            },
        });
        return {
            id: row.id,
            codeMasked: (0, redeem_mask_1.maskRedeemCode)(row.codeSecret),
            code: row.codeSecret,
            title: row.redeemCode.title,
        };
    }
    toAdminClaimRow(r, recent) {
        const abuseScore = r.flagged
            ? Math.max(75, Math.min(99, 50 + recent * 15))
            : Math.min(70, recent * 12);
        return {
            id: r.id,
            title: r.redeemCode.title,
            refId: r.redeemCodeId,
            codeMasked: (0, redeem_mask_1.maskRedeemCode)(r.codeSecret),
            deviceId: r.user.email,
            userId: r.user.id,
            userDisplayName: r.user.displayName,
            result: r.flagged ? 'FLAGGED' : 'SUCCESS',
            whenLabel: (0, redeem_labels_1.relativeRedeemLabel)(r.createdAt),
            createdAt: r.createdAt.toISOString(),
            stockAfter: r.redeemCode.stockLeft,
            abuseScore,
            note: r.adminNote?.trim() ||
                (r.flagged
                    ? 'Flagged by staff for review.'
                    : 'Claimed on unlock (scratch). Stock consumed at claim.'),
        };
    }
    assertClaimId(claimId) {
        const id = claimId?.trim() ?? '';
        if (id.length < 10 ||
            id.length > 40 ||
            id.includes('/') ||
            !/^[a-z0-9_-]+$/i.test(id)) {
            throw new app_error_1.AppError('CLAIM_BAD_ID', 'Invalid claim id.', 400);
        }
    }
};
exports.RedeemClaimsService = RedeemClaimsService;
exports.RedeemClaimsService = RedeemClaimsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        settings_service_1.SettingsService])
], RedeemClaimsService);
//# sourceMappingURL=redeem-claims.service.js.map