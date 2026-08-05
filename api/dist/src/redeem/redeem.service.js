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
exports.RedeemService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const app_error_1 = require("../common/errors/app-error");
const settings_service_1 = require("../settings/settings.service");
const analytics_service_1 = require("../analytics/analytics.service");
const redeem_mask_1 = require("./redeem-mask");
let RedeemService = class RedeemService {
    prisma;
    settings;
    analytics;
    constructor(prisma, settings, analytics) {
        this.prisma = prisma;
        this.settings = settings;
        this.analytics = analytics;
    }
    async catalog(userId) {
        const now = new Date();
        const codes = await this.prisma.redeemCode.findMany({
            where: {
                status: {
                    in: [
                        client_1.RedeemCodeStatus.ACTIVE,
                        client_1.RedeemCodeStatus.EXHAUSTED,
                        client_1.RedeemCodeStatus.EXPIRED,
                        client_1.RedeemCodeStatus.PAUSED,
                    ],
                },
            },
            orderBy: { createdAt: 'asc' },
        });
        const claims = await this.prisma.redeemClaim.findMany({
            where: { userId },
            select: { redeemCodeId: true, codeSecret: true },
        });
        const claimMap = new Map(claims.map((c) => [c.redeemCodeId, c.codeSecret]));
        return {
            items: codes.map((row) => {
                const mine = claimMap.get(row.id);
                const claimedByMe = Boolean(mine);
                const expiredByTime = row.expiresAt != null && row.expiresAt.getTime() <= now.getTime();
                const listStatus = expiredByTime || row.status === client_1.RedeemCodeStatus.EXPIRED
                    ? 'CLAIMED'
                    : row.status === client_1.RedeemCodeStatus.ACTIVE && row.stockLeft > 0
                        ? claimedByMe
                            ? 'CLAIMED'
                            : 'ACTIVE'
                        : row.status === client_1.RedeemCodeStatus.EXHAUSTED || row.stockLeft <= 0
                            ? 'CLAIMED'
                            : row.status === client_1.RedeemCodeStatus.ACTIVE
                                ? 'ACTIVE'
                                : 'CLAIMED';
                return {
                    id: row.id,
                    type: row.type,
                    title: row.title,
                    valueLabel: row.valueLabel,
                    codeMasked: (0, redeem_mask_1.maskRedeemCode)(row.codeSecret),
                    code: claimedByMe ? mine : null,
                    status: listStatus,
                    expiresLabel: row.expiresLabel,
                    tip: row.tip,
                    redeemUrl: row.redeemUrl,
                    stockLeft: row.stockLeft,
                    coinCost: row.coinCost,
                    cadence: row.cadence,
                    unlocked: claimedByMe,
                };
            }),
        };
    }
    async claim(userId, redeemCodeId) {
        this.assertRedeemId(redeemCodeId);
        const seat = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { isActive: true, isRestricted: true, coins: true },
        });
        if (!seat || !seat.isActive) {
            throw new app_error_1.AppError('AUTH_SUSPENDED', 'This account is suspended.', 403);
        }
        if (seat.isRestricted) {
            throw new app_error_1.AppError('USER_RESTRICTED', 'Redeem is paused while this account is restricted.', 403);
        }
        const existing = await this.prisma.redeemClaim.findUnique({
            where: {
                userId_redeemCodeId: { userId, redeemCodeId },
            },
        });
        if (existing) {
            return {
                id: redeemCodeId,
                code: existing.codeSecret,
                alreadyClaimed: true,
                coinCost: null,
                coinsRemaining: seat.coins,
            };
        }
        try {
            const result = await this.prisma.$transaction(async (tx) => {
                const code = await tx.redeemCode.findUnique({
                    where: { id: redeemCodeId },
                });
                if (!code) {
                    throw new app_error_1.AppError('REDEEM_NOT_FOUND', 'Code not found.', 404);
                }
                if (code.status === client_1.RedeemCodeStatus.PAUSED) {
                    throw new app_error_1.AppError('REDEEM_PAUSED', 'This code is paused right now.', 409);
                }
                const now = new Date();
                if (code.status === client_1.RedeemCodeStatus.EXPIRED ||
                    (code.expiresAt != null && code.expiresAt.getTime() <= now.getTime())) {
                    if (code.status !== client_1.RedeemCodeStatus.EXPIRED) {
                        await tx.redeemCode.update({
                            where: { id: redeemCodeId },
                            data: { status: client_1.RedeemCodeStatus.EXPIRED },
                        });
                    }
                    throw new app_error_1.AppError('REDEEM_EXPIRED', 'This code has expired.', 409);
                }
                if (code.status === client_1.RedeemCodeStatus.EXHAUSTED ||
                    code.stockLeft <= 0) {
                    throw new app_error_1.AppError('OUT_OF_STOCK', 'This code is no longer available.', 409);
                }
                if (code.status !== client_1.RedeemCodeStatus.ACTIVE) {
                    throw new app_error_1.AppError('REDEEM_UNAVAILABLE', 'This code is not available.', 409);
                }
                if (code.stockLeft !== 1) {
                    throw new app_error_1.AppError('REDEEM_STOCK_INVALID', 'This code inventory is misconfigured.', 409);
                }
                await this.assertCadenceWindow(tx, userId, code.cadence, now);
                const live = await tx.user.findUnique({
                    where: { id: userId },
                    select: { isActive: true, isRestricted: true },
                });
                if (!live || !live.isActive) {
                    throw new app_error_1.AppError('AUTH_SUSPENDED', 'This account is suspended.', 403);
                }
                if (live.isRestricted) {
                    throw new app_error_1.AppError('USER_RESTRICTED', 'Redeem is paused while this account is restricted.', 403);
                }
                const cost = code.coinCost;
                if (cost != null && cost > 0) {
                    const paid = await tx.user.updateMany({
                        where: {
                            id: userId,
                            coins: { gte: cost },
                            isActive: true,
                            isRestricted: false,
                        },
                        data: { coins: { decrement: cost } },
                    });
                    if (paid.count !== 1) {
                        throw new app_error_1.AppError('NOT_ENOUGH_COINS', `You need ${cost} coins to unlock this reward.`, 409);
                    }
                    const afterPay = await tx.user.findUniqueOrThrow({
                        where: { id: userId },
                        select: { coins: true },
                    });
                    await tx.walletLedger.create({
                        data: {
                            userId,
                            delta: -cost,
                            balanceAfter: afterPay.coins,
                            reason: `redeem:${redeemCodeId}`,
                            idempotencyKey: `redeem:${userId}:${redeemCodeId}`,
                        },
                    });
                }
                const updated = await tx.redeemCode.updateMany({
                    where: {
                        id: redeemCodeId,
                        status: client_1.RedeemCodeStatus.ACTIVE,
                        stockLeft: 1,
                    },
                    data: {
                        stockLeft: { decrement: 1 },
                        status: client_1.RedeemCodeStatus.EXHAUSTED,
                    },
                });
                if (updated.count !== 1) {
                    throw new app_error_1.AppError('OUT_OF_STOCK', 'This code is no longer available.', 409);
                }
                const claim = await tx.redeemClaim.create({
                    data: {
                        userId,
                        redeemCodeId,
                        codeSecret: code.codeSecret,
                    },
                });
                const user = await tx.user.findUniqueOrThrow({
                    where: { id: userId },
                    select: { coins: true },
                });
                return {
                    id: redeemCodeId,
                    code: claim.codeSecret,
                    alreadyClaimed: false,
                    coinCost: cost,
                    coinsRemaining: user.coins,
                };
            });
            this.analytics.trackSafe({
                name: 'redeem_claim',
                userId,
                props: { redeem_id: redeemCodeId.slice(0, 40) },
            });
            return result;
        }
        catch (err) {
            if (err instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                err.code === 'P2002') {
                const again = await this.prisma.redeemClaim.findUnique({
                    where: {
                        userId_redeemCodeId: { userId, redeemCodeId },
                    },
                });
                if (again) {
                    const user = await this.prisma.user.findUniqueOrThrow({
                        where: { id: userId },
                        select: { coins: true },
                    });
                    return {
                        id: redeemCodeId,
                        code: again.codeSecret,
                        alreadyClaimed: true,
                        coinCost: null,
                        coinsRemaining: user.coins,
                    };
                }
            }
            throw err;
        }
    }
    assertRedeemId(redeemCodeId) {
        const id = redeemCodeId?.trim() ?? '';
        if (id.length < 10 || id.length > 40 || !/^[a-z0-9_-]+$/i.test(id)) {
            throw new app_error_1.AppError('REDEEM_INVALID_ID', 'Invalid redeem code id.', 400);
        }
    }
    async assertCadenceWindow(tx, userId, cadence, now) {
        const since = cadence === client_1.RedeemCadence.WEEKLY
            ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            : new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const limit = cadence === client_1.RedeemCadence.WEEKLY ? 2 : 3;
        const recent = await tx.redeemClaim.count({
            where: {
                userId,
                createdAt: { gte: since },
                redeemCode: { cadence },
            },
        });
        if (recent >= limit) {
            throw new app_error_1.AppError('REDEEM_CADENCE_LIMIT', cadence === client_1.RedeemCadence.WEEKLY
                ? 'Weekly redeem limit reached. Try again later.'
                : 'Daily redeem limit reached. Try again tomorrow.', 429);
        }
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
            whenLabel: relativeLabel(r.createdAt),
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
            whenLabel: relativeLabel(r.createdAt),
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
        if (id.length < 10 || id.length > 40 || id.includes('/') || !/^[a-z0-9_-]+$/i.test(id)) {
            throw new app_error_1.AppError('CLAIM_BAD_ID', 'Invalid claim id.', 400);
        }
    }
};
exports.RedeemService = RedeemService;
exports.RedeemService = RedeemService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        settings_service_1.SettingsService,
        analytics_service_1.AnalyticsService])
], RedeemService);
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
//# sourceMappingURL=redeem.service.js.map