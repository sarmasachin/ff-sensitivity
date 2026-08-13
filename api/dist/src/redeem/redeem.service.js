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
const analytics_service_1 = require("../analytics/analytics.service");
const redeem_scratch_service_1 = require("./redeem-scratch.service");
const redeem_claims_service_1 = require("./redeem-claims.service");
const redeem_catalog_service_1 = require("./redeem-catalog.service");
let RedeemService = class RedeemService {
    prisma;
    analytics;
    scratchService;
    claimsService;
    catalogService;
    constructor(prisma, analytics, scratchService, claimsService, catalogService) {
        this.prisma = prisma;
        this.analytics = analytics;
        this.scratchService = scratchService;
        this.claimsService = claimsService;
        this.catalogService = catalogService;
    }
    catalog(userId) {
        return this.catalogService.catalog(userId);
    }
    async claim(userId, redeemCodeId) {
        this.assertRedeemId(redeemCodeId);
        const modeRow = await this.prisma.redeemCode.findUnique({
            where: { id: redeemCodeId },
            select: { mode: true },
        });
        if (!modeRow) {
            throw new app_error_1.AppError('REDEEM_NOT_FOUND', 'Code not found.', 404);
        }
        if (modeRow.mode === client_1.RedeemMode.SCRATCH_REWARD) {
            throw new app_error_1.AppError('REDEEM_USE_SCRATCH', 'Use scratch to earn coins on this card.', 409);
        }
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
    scratch(userId, redeemCodeId, attemptKey) {
        this.assertRedeemId(redeemCodeId);
        return this.scratchService.scratch(userId, redeemCodeId, attemptKey);
    }
    scratchAdUnlock(userId, redeemCodeId) {
        this.assertRedeemId(redeemCodeId);
        return this.scratchService.adUnlock(userId, redeemCodeId);
    }
    myClaims(userId) {
        return this.claimsService.myClaims(userId);
    }
    assertRedeemId(redeemCodeId) {
        const id = redeemCodeId?.trim() ?? '';
        if (id.length < 10 || id.length > 40 || !/^[a-z0-9_-]+$/i.test(id)) {
            throw new app_error_1.AppError('REDEEM_INVALID_ID', 'Invalid redeem code id.', 400);
        }
    }
    async assertCadenceWindow(tx, userId, cadence, now) {
        const def = await tx.redeemCadenceDef.findUnique({ where: { id: cadence } });
        const windowHours = def?.windowHours ?? (cadence === 'WEEKLY' ? 168 : 24);
        const limit = def?.claimLimit ?? (cadence === 'WEEKLY' ? 2 : 3);
        const since = new Date(now.getTime() - windowHours * 60 * 60 * 1000);
        const recent = await tx.redeemClaim.count({
            where: {
                userId,
                createdAt: { gte: since },
                redeemCode: { cadence },
            },
        });
        if (recent >= limit) {
            const label = def?.label ?? cadence;
            throw new app_error_1.AppError('REDEEM_CADENCE_LIMIT', `${label} redeem limit reached. Try again later.`, 429);
        }
    }
};
exports.RedeemService = RedeemService;
exports.RedeemService = RedeemService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        analytics_service_1.AnalyticsService,
        redeem_scratch_service_1.RedeemScratchService,
        redeem_claims_service_1.RedeemClaimsService,
        redeem_catalog_service_1.RedeemCatalogService])
], RedeemService);
//# sourceMappingURL=redeem.service.js.map