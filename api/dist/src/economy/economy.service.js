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
exports.EconomyService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const app_error_1 = require("../common/errors/app-error");
const economy_catalog_1 = require("./economy-catalog");
let EconomyService = class EconomyService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getWallet(userId) {
        const user = await this.requireUser(userId);
        const boosts = await this.prisma.userBoostCharge.findMany({
            where: { userId, charges: { gt: 0 } },
        });
        const shopRows = await this.prisma.walletLedger.findMany({
            where: { userId, reason: { startsWith: 'shop:' } },
            select: { reason: true },
        });
        const shopBuyCounts = {};
        for (const row of shopRows) {
            const id = row.reason.slice('shop:'.length);
            if (!id)
                continue;
            shopBuyCounts[id] = (shopBuyCounts[id] ?? 0) + 1;
        }
        const ownedShopIds = Object.values(economy_catalog_1.SHOP_CATALOG)
            .filter((item) => item.oneTime && (shopBuyCounts[item.id] ?? 0) > 0)
            .map((item) => item.id);
        return {
            coins: user.coins,
            frozen: user.walletFrozen,
            boosts: Object.fromEntries(boosts.map((b) => [b.boostId, b.charges])),
            ownedShopIds,
            shopBuyCounts,
        };
    }
    async earnChallenge(userId, kind, opts) {
        const user = await this.requireUser(userId);
        this.assertNotFrozen(user);
        const day = (0, economy_catalog_1.utcDateKey)();
        switch (kind) {
            case 'CHECKIN':
                return this.earnCheckin(userId, day);
            case 'QUIZ':
                throw new app_error_1.AppError('ECONOMY_QUIZ_MOVED', 'Submit quiz via /api/v1/challenge/quiz/submit.', 400);
            case 'AD':
                return this.earnAd(userId);
            case 'MILESTONE':
                return this.earnMilestone(userId, opts.milestoneDays);
            default:
                throw new app_error_1.AppError('ECONOMY_INVALID', 'Unknown earn kind.', 400);
        }
    }
    async purchaseShop(userId, itemId, requestId) {
        const user = await this.requireUser(userId);
        this.assertNotFrozen(user);
        const item = economy_catalog_1.SHOP_CATALOG[itemId];
        if (!item || !item.enabled) {
            throw new app_error_1.AppError('SHOP_ITEM_NOT_FOUND', 'Item not found.', 404);
        }
        const safeReq = requestId.trim();
        if (safeReq.length < 8 || safeReq.length > 80) {
            throw new app_error_1.AppError('SHOP_BAD_REQUEST', 'Invalid request id.', 400);
        }
        const buyKeyBase = `shop:${userId}:${itemId}`;
        if (item.oneTime) {
            const prior = await this.prisma.walletLedger.findFirst({
                where: { userId, reason: `shop:${itemId}` },
            });
            if (prior) {
                throw new app_error_1.AppError('SHOP_ALREADY_OWNED', 'Already owned.', 409);
            }
        }
        if (item.stockLimit != null) {
            const buys = await this.prisma.walletLedger.count({
                where: { userId, reason: `shop:${itemId}` },
            });
            if (buys >= item.stockLimit) {
                throw new app_error_1.AppError('SHOP_OUT_OF_STOCK', 'Out of stock.', 409);
            }
        }
        const idempotencyKey = item.oneTime
            ? `${buyKeyBase}:once`
            : `${buyKeyBase}:req:${safeReq}`;
        return this.prisma.$transaction(async (tx) => {
            const existing = await tx.walletLedger.findUnique({
                where: { idempotencyKey },
            });
            if (existing) {
                return {
                    coins: existing.balanceAfter,
                    itemId,
                    alreadyApplied: true,
                };
            }
            const paid = await tx.user.updateMany({
                where: { id: userId, coins: { gte: item.priceCoins } },
                data: { coins: { decrement: item.priceCoins } },
            });
            if (paid.count !== 1) {
                throw new app_error_1.AppError('NOT_ENOUGH_COINS', `You need ${item.priceCoins} coins.`, 409);
            }
            const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
            await tx.walletLedger.create({
                data: {
                    userId,
                    delta: -item.priceCoins,
                    balanceAfter: user.coins,
                    reason: `shop:${itemId}`,
                    idempotencyKey,
                },
            });
            if (item.isBoost) {
                await tx.userBoostCharge.upsert({
                    where: {
                        userId_boostId: { userId, boostId: itemId },
                    },
                    create: { userId, boostId: itemId, charges: 1 },
                    update: { charges: { increment: 1 } },
                });
            }
            return { coins: user.coins, itemId, alreadyApplied: false };
        });
    }
    async earnQuizGraded(userId, correct, amounts) {
        const user = await this.requireUser(userId);
        this.assertNotFrozen(user);
        const day = (0, economy_catalog_1.utcDateKey)();
        return this.earnQuiz(userId, day, correct, amounts);
    }
    async earnScratchCoins(userId, day, slot, amount) {
        const user = await this.requireUser(userId);
        this.assertNotFrozen(user);
        const safe = Math.max(0, Math.min(100_000, Math.floor(amount)));
        const key = `earn:scratch:${userId}:${day}:${slot}`;
        return this.applyEarn(userId, key, async () => ({
            delta: safe,
            reason: 'earn:scratch',
        }));
    }
    async requireUserPublic(userId) {
        return this.requireUser(userId);
    }
    async earnCheckin(userId, day) {
        const key = `earn:checkin:${userId}:${day}`;
        return this.applyEarn(userId, key, async (tx) => {
            const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
            const yesterday = (0, economy_catalog_1.utcDateKey)(new Date(Date.now() - 24 * 60 * 60 * 1000));
            const streak = user.lastCheckinDay === yesterday
                ? user.streakDays + 1
                : user.lastCheckinDay === day
                    ? user.streakDays
                    : 1;
            await tx.user.update({
                where: { id: userId },
                data: { streakDays: streak, lastCheckinDay: day },
            });
            let delta = economy_catalog_1.ECONOMY_AMOUNTS.checkin;
            let usedBoost = false;
            const boost = await tx.userBoostCharge.findUnique({
                where: {
                    userId_boostId: { userId, boostId: economy_catalog_1.BOOST_CHECKIN },
                },
            });
            if (boost && boost.charges > 0) {
                delta += economy_catalog_1.ECONOMY_AMOUNTS.checkinBoostExtra;
                usedBoost = true;
                await tx.userBoostCharge.update({
                    where: { id: boost.id },
                    data: { charges: { decrement: 1 } },
                });
            }
            return { delta, reason: usedBoost ? 'earn:checkin:boost' : 'earn:checkin' };
        });
    }
    async earnQuiz(userId, day, correct, amounts) {
        const correctCoins = amounts?.correctCoins ?? economy_catalog_1.ECONOMY_AMOUNTS.quizCorrect;
        const wrongCoins = amounts?.wrongCoins ?? economy_catalog_1.ECONOMY_AMOUNTS.quizWrong;
        if (correct) {
            const key = `earn:quiz:ok:${userId}:${day}`;
            return this.applyEarn(userId, key, async (tx) => {
                let delta = correctCoins;
                let usedBoost = false;
                const boost = await tx.userBoostCharge.findUnique({
                    where: {
                        userId_boostId: { userId, boostId: economy_catalog_1.BOOST_QUIZ },
                    },
                });
                if (boost && boost.charges > 0) {
                    delta = correctCoins * 2;
                    usedBoost = true;
                    await tx.userBoostCharge.update({
                        where: { id: boost.id },
                        data: { charges: { decrement: 1 } },
                    });
                }
                return {
                    delta,
                    reason: usedBoost ? 'earn:quiz:ok:boost' : 'earn:quiz:ok',
                };
            });
        }
        const wrongCount = await this.prisma.walletLedger.count({
            where: {
                userId,
                reason: 'earn:quiz:wrong',
                idempotencyKey: { startsWith: `earn:quiz:wrong:${userId}:${day}:` },
            },
        });
        if (wrongCount >= 2) {
            throw new app_error_1.AppError('ECONOMY_QUIZ_CLOSED', 'Quiz closed for today.', 409);
        }
        const key = `earn:quiz:wrong:${userId}:${day}:${wrongCount + 1}`;
        return this.applyEarn(userId, key, async () => ({
            delta: wrongCoins,
            reason: 'earn:quiz:wrong',
        }));
    }
    async earnAd(userId) {
        const config = await this.prisma.challengeConfig.findUnique({
            where: { id: 'default' },
        });
        if (config && !config.adBonusOptional) {
            throw new app_error_1.AppError('ECONOMY_AD_DISABLED', 'Ad bonus is disabled.', 403);
        }
        const cooldownHours = Math.max(1, config?.adBonusCooldownHours ?? 4);
        const coins = Math.max(0, config?.adBonusCoins ?? economy_catalog_1.ECONOMY_AMOUNTS.adBonus);
        const cooldownMs = cooldownHours * 60 * 60 * 1000;
        const idempotencyKey = `earn:ad:${userId}:${(0, crypto_1.randomUUID)()}`;
        return this.prisma.$transaction(async (tx) => {
            const last = await tx.walletLedger.findFirst({
                where: { userId, reason: 'earn:ad' },
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true },
            });
            if (last) {
                const nextAt = last.createdAt.getTime() + cooldownMs;
                if (Date.now() < nextAt) {
                    throw new app_error_1.AppError('ECONOMY_AD_COOLDOWN', 'Ad bonus is on cooldown. Try again later.', 409, { nextAdAvailableAtMs: nextAt });
                }
            }
            const existing = await tx.walletLedger.findUnique({
                where: { idempotencyKey },
            });
            if (existing) {
                return {
                    coins: existing.balanceAfter,
                    delta: existing.delta,
                    alreadyApplied: true,
                    reason: existing.reason,
                    nextAdAvailableAtMs: existing.createdAt.getTime() + cooldownMs,
                };
            }
            const current = await tx.user.findUniqueOrThrow({ where: { id: userId } });
            if (current.walletFrozen) {
                throw new app_error_1.AppError('WALLET_FROZEN', 'Wallet is frozen.', 403);
            }
            const nextCoins = Math.max(0, Math.min(9_999_999, current.coins + coins));
            const delta = nextCoins - current.coins;
            await tx.user.update({
                where: { id: userId },
                data: { coins: nextCoins },
            });
            const row = await tx.walletLedger.create({
                data: {
                    userId,
                    delta,
                    balanceAfter: nextCoins,
                    reason: 'earn:ad',
                    idempotencyKey,
                },
            });
            return {
                coins: nextCoins,
                delta,
                alreadyApplied: false,
                reason: 'earn:ad',
                nextAdAvailableAtMs: row.createdAt.getTime() + cooldownMs,
            };
        });
    }
    async earnMilestone(userId, days) {
        if (days == null || days < 1 || days > 365) {
            throw new app_error_1.AppError('ECONOMY_MILESTONE_INVALID', 'Unknown milestone.', 400);
        }
        const fromDb = await this.prisma.challengeMilestone.findFirst({
            where: { days, enabled: true },
        });
        const reward = fromDb?.coinReward ?? economy_catalog_1.MILESTONE_REWARDS[days];
        if (reward == null) {
            throw new app_error_1.AppError('ECONOMY_MILESTONE_INVALID', 'Unknown milestone.', 400);
        }
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        if (user.streakDays < days) {
            throw new app_error_1.AppError('ECONOMY_STREAK_REQUIRED', `Need ${days}-day streak first.`, 409);
        }
        const key = `earn:milestone:${userId}:${days}`;
        return this.applyEarn(userId, key, async () => ({
            delta: reward,
            reason: `earn:milestone:${days}`,
        }));
    }
    async applyEarn(userId, idempotencyKey, build) {
        return this.prisma.$transaction(async (tx) => {
            const existing = await tx.walletLedger.findUnique({
                where: { idempotencyKey },
            });
            if (existing) {
                return {
                    coins: existing.balanceAfter,
                    delta: existing.delta,
                    alreadyApplied: true,
                    reason: existing.reason,
                };
            }
            const { delta, reason } = await build(tx);
            const current = await tx.user.findUniqueOrThrow({ where: { id: userId } });
            const nextCoins = Math.max(0, Math.min(9_999_999, current.coins + delta));
            await tx.user.update({
                where: { id: userId },
                data: { coins: nextCoins },
            });
            await tx.walletLedger.create({
                data: {
                    userId,
                    delta: nextCoins - current.coins,
                    balanceAfter: nextCoins,
                    reason,
                    idempotencyKey,
                },
            });
            return {
                coins: nextCoins,
                delta: nextCoins - current.coins,
                alreadyApplied: false,
                reason,
            };
        });
    }
    async requireUser(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.isActive) {
            throw new app_error_1.AppError('AUTH_SUSPENDED', 'This account is suspended.', 403);
        }
        return user;
    }
    assertNotFrozen(user) {
        if (user.walletFrozen) {
            throw new app_error_1.AppError('WALLET_FROZEN', 'This wallet is frozen by ops.', 403);
        }
    }
};
exports.EconomyService = EconomyService;
exports.EconomyService = EconomyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EconomyService);
//# sourceMappingURL=economy.service.js.map