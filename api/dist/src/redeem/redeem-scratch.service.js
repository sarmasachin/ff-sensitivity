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
exports.RedeemScratchService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const app_error_1 = require("../common/errors/app-error");
const analytics_service_1 = require("../analytics/analytics.service");
const redeem_mask_1 = require("./redeem-mask");
const redeem_scratch_math_1 = require("./redeem-scratch-math");
let RedeemScratchService = class RedeemScratchService {
    prisma;
    analytics;
    constructor(prisma, analytics) {
        this.prisma = prisma;
        this.analytics = analytics;
    }
    static SAFE_TIP = redeem_scratch_math_1.REDEEM_SCRATCH_SAFE_TIP;
    async scratch(userId, redeemCodeId, attemptKeyRaw) {
        const attemptKey = (0, redeem_scratch_math_1.assertScratchAttemptKey)(attemptKeyRaw);
        await this.assertSeat(userId);
        const prior = await this.prisma.redeemScratchRoll.findUnique({
            where: {
                userId_redeemCodeId_attemptKey: {
                    userId,
                    redeemCodeId,
                    attemptKey,
                },
            },
        });
        if (prior) {
            const user = await this.prisma.user.findUniqueOrThrow({
                where: { id: userId },
                select: { coins: true },
            });
            return this.toScratchResult(prior, user.coins, true);
        }
        try {
            const result = await this.prisma.$transaction(async (tx) => {
                const code = await tx.redeemCode.findUnique({
                    where: { id: redeemCodeId },
                });
                if (!code) {
                    throw new app_error_1.AppError('REDEEM_NOT_FOUND', 'Card not found.', 404);
                }
                if (code.mode !== client_1.RedeemMode.SCRATCH_REWARD) {
                    throw new app_error_1.AppError('REDEEM_WRONG_MODE', 'This card is not a scratch-reward card.', 409);
                }
                this.assertScratchCardOpen(code, new Date());
                const pass = await tx.redeemScratchPass.findUnique({
                    where: {
                        userId_redeemCodeId: { userId, redeemCodeId },
                    },
                });
                const allowed = pass?.allowedAttempts ?? 1;
                const used = await tx.redeemScratchRoll.count({
                    where: { userId, redeemCodeId },
                });
                if (used >= allowed) {
                    throw new app_error_1.AppError('REDEEM_NEED_AD', 'Watch an ad to scratch again and earn more coins.', 409);
                }
                const min = code.coinRewardMin ?? 5;
                const max = code.coinRewardMax ?? Math.max(min, 20);
                const coinsGranted = (0, redeem_scratch_math_1.rollScratchCoins)(min, max);
                const updatedUser = await tx.user.update({
                    where: { id: userId },
                    data: { coins: { increment: coinsGranted } },
                    select: { coins: true },
                });
                await tx.walletLedger.create({
                    data: {
                        userId,
                        delta: coinsGranted,
                        balanceAfter: updatedUser.coins,
                        reason: 'earn:redeem_scratch',
                        idempotencyKey: `earn:redeem_scratch:${userId}:${redeemCodeId}:${attemptKey}`,
                    },
                });
                let wonSecret = null;
                const startsAt = code.startsAt ?? code.createdAt;
                const wIdx = (0, redeem_scratch_math_1.scratchWindowIndex)(startsAt, code.windowMinutes, new Date());
                if (wIdx >= 0) {
                    const alreadyWon = await tx.redeemScratchRoll.findFirst({
                        where: {
                            userId,
                            redeemCodeId,
                            codeSecret: { not: null },
                        },
                        select: { id: true },
                    });
                    if (!alreadyWon) {
                        const awardedInWindow = await tx.redeemCodeSecret.count({
                            where: {
                                redeemCodeId,
                                status: client_1.RedeemSecretStatus.ASSIGNED,
                                awardWindow: wIdx,
                            },
                        });
                        if (awardedInWindow < Math.max(1, code.codesPerWindow)) {
                            const unused = await tx.redeemCodeSecret.findFirst({
                                where: {
                                    redeemCodeId,
                                    status: client_1.RedeemSecretStatus.UNUSED,
                                },
                                orderBy: { createdAt: 'asc' },
                            });
                            if (unused) {
                                const took = await tx.redeemCodeSecret.updateMany({
                                    where: {
                                        id: unused.id,
                                        status: client_1.RedeemSecretStatus.UNUSED,
                                    },
                                    data: {
                                        status: client_1.RedeemSecretStatus.ASSIGNED,
                                        assignedUserId: userId,
                                        assignedAt: new Date(),
                                        awardWindow: wIdx,
                                    },
                                });
                                if (took.count === 1) {
                                    wonSecret = unused.codeSecret;
                                    const left = await tx.redeemCodeSecret.count({
                                        where: {
                                            redeemCodeId,
                                            status: client_1.RedeemSecretStatus.UNUSED,
                                        },
                                    });
                                    await tx.redeemCode.update({
                                        where: { id: redeemCodeId },
                                        data: { stockLeft: left },
                                    });
                                    await tx.redeemClaim.upsert({
                                        where: {
                                            userId_redeemCodeId: { userId, redeemCodeId },
                                        },
                                        create: {
                                            userId,
                                            redeemCodeId,
                                            codeSecret: wonSecret,
                                        },
                                        update: { codeSecret: wonSecret },
                                    });
                                }
                            }
                        }
                    }
                }
                const roll = await tx.redeemScratchRoll.create({
                    data: {
                        userId,
                        redeemCodeId,
                        attemptKey,
                        coinsGranted,
                        codeSecret: wonSecret,
                    },
                });
                return this.toScratchResult(roll, updatedUser.coins, false);
            });
            this.analytics.trackSafe({
                name: 'redeem_scratch',
                userId,
                props: {
                    redeem_id: redeemCodeId.slice(0, 40),
                    coins: result.coinsGranted,
                    got_code: Boolean(result.code),
                },
            });
            return result;
        }
        catch (err) {
            if (err instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                err.code === 'P2002') {
                const again = await this.prisma.redeemScratchRoll.findUnique({
                    where: {
                        userId_redeemCodeId_attemptKey: {
                            userId,
                            redeemCodeId,
                            attemptKey,
                        },
                    },
                });
                if (again) {
                    const user = await this.prisma.user.findUniqueOrThrow({
                        where: { id: userId },
                        select: { coins: true },
                    });
                    return this.toScratchResult(again, user.coins, true);
                }
            }
            throw err;
        }
    }
    async adUnlock(userId, redeemCodeId) {
        await this.assertSeat(userId);
        const code = await this.prisma.redeemCode.findUnique({
            where: { id: redeemCodeId },
        });
        if (!code) {
            throw new app_error_1.AppError('REDEEM_NOT_FOUND', 'Card not found.', 404);
        }
        if (code.mode !== client_1.RedeemMode.SCRATCH_REWARD) {
            throw new app_error_1.AppError('REDEEM_WRONG_MODE', 'This card is not a scratch-reward card.', 409);
        }
        this.assertScratchCardOpen(code, new Date());
        const used = await this.prisma.redeemScratchRoll.count({
            where: { userId, redeemCodeId },
        });
        const pass = await this.prisma.redeemScratchPass.findUnique({
            where: { userId_redeemCodeId: { userId, redeemCodeId } },
        });
        const allowed = pass?.allowedAttempts ?? 1;
        if (used < allowed) {
            return {
                ok: true,
                alreadyAllowed: true,
                allowedAttempts: allowed,
                usedAttempts: used,
                needsAd: false,
            };
        }
        const next = await this.prisma.redeemScratchPass.upsert({
            where: { userId_redeemCodeId: { userId, redeemCodeId } },
            create: {
                userId,
                redeemCodeId,
                allowedAttempts: used + 1,
            },
            update: { allowedAttempts: { increment: 1 } },
        });
        this.analytics.trackSafe({
            name: 'redeem_scratch_ad_unlock',
            userId,
            props: { redeem_id: redeemCodeId.slice(0, 40) },
        });
        return {
            ok: true,
            alreadyAllowed: false,
            allowedAttempts: next.allowedAttempts,
            usedAttempts: used,
            needsAd: false,
        };
    }
    async scratchMeta(userId, redeemCodeId) {
        const [used, pass] = await Promise.all([
            this.prisma.redeemScratchRoll.count({
                where: { userId, redeemCodeId },
            }),
            this.prisma.redeemScratchPass.findUnique({
                where: { userId_redeemCodeId: { userId, redeemCodeId } },
            }),
        ]);
        const allowed = pass?.allowedAttempts ?? 1;
        return {
            usedAttempts: used,
            allowedAttempts: allowed,
            needsAd: used >= allowed,
            canScratch: used < allowed,
        };
    }
    assertScratchCardOpen(code, now) {
        if (code.status === client_1.RedeemCodeStatus.PAUSED) {
            throw new app_error_1.AppError('REDEEM_PAUSED', 'This scratch card is paused right now.', 409);
        }
        if (code.status === client_1.RedeemCodeStatus.EXPIRED ||
            (code.expiresAt != null && code.expiresAt.getTime() <= now.getTime())) {
            throw new app_error_1.AppError('REDEEM_EXPIRED', 'This scratch card has ended.', 409);
        }
        if (code.status !== client_1.RedeemCodeStatus.ACTIVE) {
            throw new app_error_1.AppError('REDEEM_UNAVAILABLE', 'This scratch card is not available.', 409);
        }
        const start = code.startsAt ?? code.createdAt;
        if (now.getTime() < start.getTime()) {
            throw new app_error_1.AppError('REDEEM_NOT_STARTED', 'This scratch card has not started yet.', 409);
        }
        if (code.endsAt != null && now.getTime() > code.endsAt.getTime()) {
            throw new app_error_1.AppError('REDEEM_SCHEDULE_ENDED', 'This scratch schedule has ended.', 409);
        }
    }
    async assertSeat(userId) {
        const seat = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { isActive: true, isRestricted: true },
        });
        if (!seat || !seat.isActive) {
            throw new app_error_1.AppError('AUTH_SUSPENDED', 'This account is suspended.', 403);
        }
        if (seat.isRestricted) {
            throw new app_error_1.AppError('USER_RESTRICTED', 'Redeem is paused while this account is restricted.', 403);
        }
    }
    toScratchResult(roll, coinsRemaining, alreadyProcessed) {
        return {
            id: roll.redeemCodeId,
            mode: client_1.RedeemMode.SCRATCH_REWARD,
            coinsGranted: roll.coinsGranted,
            code: roll.codeSecret,
            codeMasked: roll.codeSecret ? (0, redeem_mask_1.maskRedeemCode)(roll.codeSecret) : null,
            alreadyProcessed,
            coinsRemaining,
            attemptKey: roll.attemptKey,
            tip: redeem_scratch_math_1.REDEEM_SCRATCH_SAFE_TIP,
        };
    }
};
exports.RedeemScratchService = RedeemScratchService;
exports.RedeemScratchService = RedeemScratchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        analytics_service_1.AnalyticsService])
], RedeemScratchService);
//# sourceMappingURL=redeem-scratch.service.js.map