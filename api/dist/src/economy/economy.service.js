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
const prisma_service_1 = require("../prisma/prisma.service");
const app_error_1 = require("../common/errors/app-error");
const scratch_history_1 = require("../scratch/scratch-history");
const shop_purchases_1 = require("../shop/shop-purchases");
const shop_admin_service_1 = require("../shop/shop-admin.service");
const economy_earn_service_1 = require("./economy-earn.service");
const premium_unlock_prices_1 = require("./premium-unlock-prices");
let EconomyService = class EconomyService {
    prisma;
    shop;
    earn;
    constructor(prisma, shop, earn) {
        this.prisma = prisma;
        this.shop = shop;
        this.earn = earn;
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
        const catalog = await this.shop.listPurchaseCatalog();
        const ownedShopIds = catalog
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
    async shopCatalog() {
        return this.shop.appCatalog();
    }
    async earnChallenge(userId, kind, opts) {
        return this.earn.earnChallenge(userId, kind, opts);
    }
    async purchaseShop(userId, itemId, requestId) {
        const user = await this.requireUser(userId);
        this.assertNotFrozen(user);
        const item = await this.shop.findPurchaseItem(itemId);
        if (!item || !item.enabled) {
            throw new app_error_1.AppError('SHOP_ITEM_NOT_FOUND', 'Item not found.', 404);
        }
        const safeReq = requestId.trim();
        if (safeReq.length < 8 || safeReq.length > 80) {
            throw new app_error_1.AppError('SHOP_BAD_REQUEST', 'Invalid request id.', 400);
        }
        const buyKeyBase = `shop:${userId}:${item.id}`;
        if (item.oneTime) {
            const prior = await this.prisma.walletLedger.findFirst({
                where: { userId, reason: `shop:${item.id}` },
            });
            if (prior) {
                throw new app_error_1.AppError('SHOP_ALREADY_OWNED', 'Already owned.', 409);
            }
        }
        const idempotencyKey = item.oneTime
            ? `${buyKeyBase}:once`
            : `${buyKeyBase}:req:${safeReq}`;
        return this.prisma.$transaction(async (tx) => {
            await tx.$queryRaw `SELECT id FROM shop_items WHERE id = ${item.id} FOR UPDATE`;
            const existing = await tx.walletLedger.findUnique({
                where: { idempotencyKey },
            });
            if (existing) {
                return {
                    coins: existing.balanceAfter,
                    itemId: item.id,
                    alreadyApplied: true,
                };
            }
            if (item.stockLimit != null) {
                const buys = await this.shop.countItemSales(item.id, tx);
                if (buys >= item.stockLimit) {
                    throw new app_error_1.AppError('SHOP_OUT_OF_STOCK', 'Out of stock.', 409);
                }
            }
            const paid = await tx.user.updateMany({
                where: { id: userId, coins: { gte: item.priceCoins } },
                data: { coins: { decrement: item.priceCoins } },
            });
            if (paid.count !== 1) {
                throw new app_error_1.AppError('NOT_ENOUGH_COINS', `You need ${item.priceCoins} coins.`, 409);
            }
            const paidUser = await tx.user.findUniqueOrThrow({ where: { id: userId } });
            const install = await tx.deviceInstall.findFirst({
                where: { userId },
                orderBy: { lastSeenAt: 'desc' },
                select: { installId: true, model: true, brand: true },
            });
            await tx.walletLedger.create({
                data: {
                    userId,
                    delta: -item.priceCoins,
                    balanceAfter: paidUser.coins,
                    reason: `shop:${item.id}`,
                    idempotencyKey,
                    shopSnapshot: (0, shop_purchases_1.buildShopSnapshot)({
                        oneTime: item.oneTime,
                        title: item.title,
                        category: item.category,
                        deviceId: install?.installId ?? '',
                        deviceLabel: (0, shop_purchases_1.deviceLabelFrom)(install?.model, install?.brand),
                    }),
                },
            });
            if (item.isBoost) {
                await tx.userBoostCharge.upsert({
                    where: {
                        userId_boostId: { userId, boostId: item.id },
                    },
                    create: { userId, boostId: item.id, charges: 1 },
                    update: { charges: { increment: 1 } },
                });
            }
            if (item.id === 'pack_scratch_bonus') {
                const sourceKey = item.oneTime
                    ? `shop:${item.id}:once`
                    : `shop:${item.id}:${safeReq}`;
                await (0, scratch_history_1.saveScratchArchive)(tx, {
                    userId,
                    sourceKey,
                    kind: 'SHOP',
                    title: item.title,
                    detail: 'Coin Shop purchase',
                    rewardLabel: item.rewardTag,
                    coins: 0,
                });
            }
            return { coins: paidUser.coins, itemId: item.id, alreadyApplied: false };
        });
    }
    async getPremiumUnlockPrices() {
        const [prices, options] = await Promise.all([
            (0, premium_unlock_prices_1.loadPremiumUnlockPrices)(this.prisma),
            (0, premium_unlock_prices_1.loadPremiumUnlockOptions)(this.prisma),
        ]);
        return {
            best_premium: prices.best_premium,
            premium_pro_max: prices.premium_pro_max,
            one_tap_premium: prices.one_tap_premium,
            coinUnlockEnabled: options.coinUnlockEnabled,
            adUnlockEnabled: options.adUnlockEnabled,
            labels: { ...premium_unlock_prices_1.PREMIUM_UNLOCK_LABEL },
        };
    }
    async spendPremiumUnlock(userId, productRaw, requestId) {
        const user = await this.requireUser(userId);
        this.assertNotFrozen(user);
        const product = String(productRaw ?? '').trim();
        if (!(0, premium_unlock_prices_1.isPremiumUnlockProduct)(product)) {
            throw new app_error_1.AppError('PREMIUM_UNLOCK_BAD_PRODUCT', 'Unknown unlock.', 400);
        }
        const safeReq = requestId.trim();
        if (safeReq.length < 8 || safeReq.length > 80) {
            throw new app_error_1.AppError('PREMIUM_UNLOCK_BAD_REQUEST', 'Invalid request id.', 400);
        }
        const options = await (0, premium_unlock_prices_1.loadPremiumUnlockOptions)(this.prisma);
        if (!options.coinUnlockEnabled) {
            throw new app_error_1.AppError('PREMIUM_UNLOCK_COIN_DISABLED', 'Coin unlock is disabled. Use watch ad instead.', 403);
        }
        const prices = await (0, premium_unlock_prices_1.loadPremiumUnlockPrices)(this.prisma);
        const cost = (0, premium_unlock_prices_1.premiumUnlockCost)(prices, product);
        const label = premium_unlock_prices_1.PREMIUM_UNLOCK_LABEL[product];
        const reason = `premium_unlock:${product}`;
        const idempotencyKey = `premium_unlock:${userId}:${product}:req:${safeReq}`;
        return this.prisma.$transaction(async (tx) => {
            const existing = await tx.walletLedger.findUnique({
                where: { idempotencyKey },
            });
            if (existing) {
                const live = await tx.user.findUniqueOrThrow({
                    where: { id: userId },
                    select: { coins: true },
                });
                return {
                    coins: live.coins,
                    product,
                    cost: Math.abs(existing.delta),
                    alreadyApplied: true,
                    label,
                };
            }
            if (cost > 0) {
                const paid = await tx.user.updateMany({
                    where: { id: userId, coins: { gte: cost } },
                    data: { coins: { decrement: cost } },
                });
                if (paid.count !== 1) {
                    throw new app_error_1.AppError('NOT_ENOUGH_COINS', `You need ${cost} coins.`, 409);
                }
            }
            const paidUser = await tx.user.findUniqueOrThrow({
                where: { id: userId },
            });
            await tx.walletLedger.create({
                data: {
                    userId,
                    delta: -cost,
                    balanceAfter: paidUser.coins,
                    reason,
                    idempotencyKey,
                },
            });
            return {
                coins: paidUser.coins,
                product,
                cost,
                alreadyApplied: false,
                label,
            };
        });
    }
    async earnQuizGraded(userId, correct, amounts) {
        return this.earn.earnQuizGraded(userId, correct, amounts);
    }
    async earnScratchCoins(userId, day, slot, amount) {
        return this.earn.earnScratchCoins(userId, day, slot, amount);
    }
    async requireUserPublic(userId) {
        return this.requireUser(userId);
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
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        shop_admin_service_1.ShopAdminService,
        economy_earn_service_1.EconomyEarnService])
], EconomyService);
//# sourceMappingURL=economy.service.js.map