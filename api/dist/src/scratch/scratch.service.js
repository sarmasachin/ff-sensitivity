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
exports.ScratchService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const app_error_1 = require("../common/errors/app-error");
const economy_service_1 = require("../economy/economy.service");
const redeem_service_1 = require("../redeem/redeem.service");
const analytics_service_1 = require("../analytics/analytics.service");
const economy_catalog_1 = require("../economy/economy-catalog");
const CONFIG_ID = 'default';
const DEFAULT_CONFIG = {
    coinsPercent: 55,
    redeemPercent: 45,
    coinAmount: 50,
    retentionDays: 30,
    autoPurge: true,
    showExpired: false,
};
let ScratchService = class ScratchService {
    prisma;
    economy;
    redeem;
    analytics;
    constructor(prisma, economy, redeem, analytics) {
        this.prisma = prisma;
        this.economy = economy;
        this.redeem = redeem;
        this.analytics = analytics;
    }
    async ensureDefaults() {
        await this.prisma.scratchConfig.upsert({
            where: { id: CONFIG_ID },
            update: {},
            create: { id: CONFIG_ID, ...DEFAULT_CONFIG },
        });
    }
    async adminGetBundle() {
        await this.ensureDefaults();
        const [config, prizes] = await Promise.all([
            this.prisma.scratchConfig.findUniqueOrThrow({ where: { id: CONFIG_ID } }),
            this.prisma.scratchPrize.findMany({
                orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            }),
        ]);
        return {
            outcomeOdds: {
                coinsPercent: config.coinsPercent,
                redeemPercent: config.redeemPercent,
                coinAmount: config.coinAmount,
            },
            policy: {
                retentionDays: config.retentionDays,
                autoPurge: config.autoPurge,
                showExpired: config.showExpired,
            },
            prizes: prizes.map((p) => this.mapPrize(p)),
        };
    }
    async adminSave(adminId, dto) {
        this.assertOutcomeOdds(dto.outcomeOdds);
        this.assertPrizes(dto.prizes);
        await this.prisma.$transaction(async (tx) => {
            await tx.scratchConfig.upsert({
                where: { id: CONFIG_ID },
                update: {
                    coinsPercent: dto.outcomeOdds.coinsPercent,
                    redeemPercent: dto.outcomeOdds.redeemPercent,
                    coinAmount: dto.outcomeOdds.coinAmount,
                    retentionDays: dto.policy.retentionDays,
                    autoPurge: dto.policy.autoPurge,
                    showExpired: dto.policy.showExpired,
                },
                create: {
                    id: CONFIG_ID,
                    coinsPercent: dto.outcomeOdds.coinsPercent,
                    redeemPercent: dto.outcomeOdds.redeemPercent,
                    coinAmount: dto.outcomeOdds.coinAmount,
                    retentionDays: dto.policy.retentionDays,
                    autoPurge: dto.policy.autoPurge,
                    showExpired: dto.policy.showExpired,
                },
            });
            await tx.scratchPrize.deleteMany({});
            if (dto.prizes.length) {
                await tx.scratchPrize.createMany({
                    data: dto.prizes.map((p, i) => ({
                        id: this.sanitizeId(p.id, `prize_${i + 1}`),
                        title: p.title.trim(),
                        detail: p.detail.trim(),
                        kind: p.kind,
                        rewardLabel: p.rewardLabel.trim(),
                        coinReward: p.coinReward,
                        oddsPercent: p.oddsPercent,
                        enabled: p.enabled,
                        streakDays: p.streakDays ?? null,
                        sortOrder: i,
                    })),
                });
            }
            await tx.auditLog.create({
                data: {
                    actorAdminId: adminId,
                    action: 'scratch.save',
                    entity: 'scratch_config:default',
                    afterJson: {
                        prizeCount: dto.prizes.length,
                        coinsPercent: dto.outcomeOdds.coinsPercent,
                        redeemPercent: dto.outcomeOdds.redeemPercent,
                    },
                },
            });
        });
        return this.adminGetBundle();
    }
    async userConfig(userId) {
        await this.ensureDefaults();
        await this.economy.requireUserPublic(userId);
        const day = (0, economy_catalog_1.utcDateKey)();
        const [config, gifts, rollsToday, challengeCfg, user] = await Promise.all([
            this.prisma.scratchConfig.findUniqueOrThrow({ where: { id: CONFIG_ID } }),
            this.prisma.scratchPrize.findMany({
                where: { enabled: true, kind: client_1.ScratchPrizeKind.GIFT },
                orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            }),
            this.prisma.scratchRoll.count({ where: { userId, dayKey: day } }),
            this.prisma.challengeConfig.findUnique({ where: { id: 'default' } }),
            this.prisma.user.findUniqueOrThrow({
                where: { id: userId },
                select: { lastCheckinDay: true },
            }),
        ]);
        const cardsPerDay = challengeCfg?.scratchCardsPerDay ?? 1;
        const checkinDone = user.lastCheckinDay === day;
        const rollsLeft = Math.max(0, cardsPerDay - rollsToday);
        return {
            dayKey: day,
            policy: {
                retentionDays: config.retentionDays,
                autoPurge: config.autoPurge,
                showExpired: config.showExpired,
            },
            outcomeOdds: {
                coinsPercent: config.coinsPercent,
                redeemPercent: config.redeemPercent,
                coinAmount: config.coinAmount,
            },
            giftPool: gifts.map((g) => ({
                id: g.id,
                title: g.title,
                rewardLabel: g.rewardLabel,
                coinReward: g.coinReward,
                oddsPercent: g.oddsPercent,
            })),
            eligibility: {
                checkinRequired: true,
                checkinDone,
                cardsPerDay,
                rollsUsed: rollsToday,
                rollsLeft,
                canRoll: checkinDone && rollsLeft > 0,
            },
        };
    }
    async userRoll(userId) {
        await this.ensureDefaults();
        await this.economy.requireUserPublic(userId);
        const day = (0, economy_catalog_1.utcDateKey)();
        const [config, challengeCfg, user, rollsToday] = await Promise.all([
            this.prisma.scratchConfig.findUniqueOrThrow({ where: { id: CONFIG_ID } }),
            this.prisma.challengeConfig.findUnique({ where: { id: 'default' } }),
            this.prisma.user.findUniqueOrThrow({
                where: { id: userId },
                select: { lastCheckinDay: true },
            }),
            this.prisma.scratchRoll.count({ where: { userId, dayKey: day } }),
        ]);
        if (user.lastCheckinDay !== day) {
            throw new app_error_1.AppError('SCRATCH_CHECKIN_REQUIRED', 'Complete today’s check-in before scratching.', 409);
        }
        const cardsPerDay = Math.max(1, Math.min(20, challengeCfg?.scratchCardsPerDay ?? 1));
        if (rollsToday >= cardsPerDay) {
            throw new app_error_1.AppError('SCRATCH_LIMIT', 'No scratch cards left today.', 409);
        }
        this.assertOutcomeOdds({
            coinsPercent: config.coinsPercent,
            redeemPercent: config.redeemPercent,
            coinAmount: config.coinAmount,
        });
        const slot = rollsToday;
        const rollPick = (0, crypto_1.randomInt)(0, 100);
        const wantCoins = rollPick < config.coinsPercent;
        const result = wantCoins
            ? await this.finishCoinsRoll(userId, day, slot, config)
            : await this.finishRedeemRoll(userId, day, slot, config);
        this.analytics.trackSafe({
            name: 'scratch_roll',
            userId,
            props: { outcome: result.outcome },
        });
        return result;
    }
    async finishCoinsRoll(userId, day, slot, config) {
        await this.reserveRollSlot(userId, day, slot);
        const gifts = await this.prisma.scratchPrize.findMany({
            where: { enabled: true, kind: client_1.ScratchPrizeKind.GIFT },
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        });
        const picked = this.weightedPick(gifts);
        const coinDelta = picked?.coinReward ?? config.coinAmount;
        const title = picked?.title ?? 'Lucky Coins';
        const rewardLabel = picked?.rewardLabel ?? `+${coinDelta} coins`;
        const prizeId = picked?.id ?? null;
        const earn = await this.economy.earnScratchCoins(userId, day, slot, coinDelta);
        await this.prisma.scratchRoll.update({
            where: {
                userId_dayKey_slot: { userId, dayKey: day, slot },
            },
            data: {
                outcome: client_1.ScratchRollOutcome.COINS,
                prizeId,
                coinDelta: earn.delta,
                title,
                rewardLabel,
                redeemCodeId: null,
            },
        });
        return {
            outcome: 'COINS',
            alreadyApplied: earn.alreadyApplied,
            coins: earn.coins,
            coinDelta: earn.delta,
            prizeId,
            title,
            rewardLabel,
            redeemCodeId: null,
            code: null,
        };
    }
    async finishRedeemRoll(userId, day, slot, config) {
        const free = await this.prisma.redeemCode.findFirst({
            where: {
                status: 'ACTIVE',
                stockLeft: 1,
                OR: [{ coinCost: null }, { coinCost: 0 }],
            },
            orderBy: { createdAt: 'asc' },
        });
        if (!free) {
            return this.finishCoinsRoll(userId, day, slot, {
                ...config,
                coinsPercent: 100,
                redeemPercent: 0,
            });
        }
        await this.reserveRollSlot(userId, day, slot);
        let claimed;
        try {
            claimed = await this.redeem.claim(userId, free.id);
        }
        catch (e) {
            return this.completeReservedAsCoins(userId, day, slot, config.coinAmount);
        }
        await this.prisma.scratchRoll.update({
            where: {
                userId_dayKey_slot: { userId, dayKey: day, slot },
            },
            data: {
                outcome: client_1.ScratchRollOutcome.REDEEM,
                prizeId: null,
                coinDelta: 0,
                redeemCodeId: free.id,
                title: free.title,
                rewardLabel: free.valueLabel,
            },
        });
        const wallet = await this.economy.getWallet(userId);
        return {
            outcome: 'REDEEM',
            alreadyApplied: !!claimed.alreadyClaimed,
            coins: wallet.coins,
            coinDelta: 0,
            prizeId: null,
            title: free.title,
            rewardLabel: free.valueLabel,
            redeemCodeId: free.id,
            code: claimed.code,
        };
    }
    async reserveRollSlot(userId, day, slot) {
        try {
            await this.prisma.scratchRoll.create({
                data: {
                    userId,
                    dayKey: day,
                    slot,
                    outcome: client_1.ScratchRollOutcome.COINS,
                    coinDelta: 0,
                    title: 'pending',
                    rewardLabel: 'pending',
                },
            });
        }
        catch (e) {
            if (e instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                e.code === 'P2002') {
                throw new app_error_1.AppError('SCRATCH_LIMIT', 'No scratch cards left today.', 409);
            }
            throw e;
        }
    }
    async completeReservedAsCoins(userId, day, slot, coinAmount) {
        const earn = await this.economy.earnScratchCoins(userId, day, slot, coinAmount);
        const title = 'Lucky Coins';
        const rewardLabel = `+${earn.delta} coins`;
        await this.prisma.scratchRoll.update({
            where: {
                userId_dayKey_slot: { userId, dayKey: day, slot },
            },
            data: {
                outcome: client_1.ScratchRollOutcome.COINS,
                prizeId: null,
                coinDelta: earn.delta,
                title,
                rewardLabel,
                redeemCodeId: null,
            },
        });
        return {
            outcome: 'COINS',
            alreadyApplied: earn.alreadyApplied,
            coins: earn.coins,
            coinDelta: earn.delta,
            prizeId: null,
            title,
            rewardLabel,
            redeemCodeId: null,
            code: null,
        };
    }
    weightedPick(rows) {
        if (!rows.length)
            return null;
        const weights = rows.map((r) => Math.max(0, r.oddsPercent));
        const sum = weights.reduce((a, b) => a + b, 0);
        if (sum <= 0)
            return rows[0] ?? null;
        let tick = (0, crypto_1.randomInt)(0, Math.ceil(sum * 10)) / 10;
        for (let i = 0; i < rows.length; i++) {
            tick -= weights[i];
            if (tick < 0)
                return rows[i] ?? null;
        }
        return rows[rows.length - 1] ?? null;
    }
    mapPrize(p) {
        return {
            id: p.id,
            title: p.title,
            detail: p.detail,
            kind: p.kind,
            rewardLabel: p.rewardLabel,
            coinReward: p.coinReward,
            oddsPercent: p.oddsPercent,
            enabled: p.enabled,
            streakDays: p.streakDays,
        };
    }
    sanitizeId(raw, fallback) {
        const id = (raw?.trim() || fallback)
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '')
            .slice(0, 64);
        if (!id || id.includes('/')) {
            throw new app_error_1.AppError('SCRATCH_BAD_ID', 'Invalid prize id.', 400);
        }
        return id;
    }
    assertOutcomeOdds(odds) {
        if (odds.coinsPercent < 0 ||
            odds.redeemPercent < 0 ||
            odds.coinsPercent > 100 ||
            odds.redeemPercent > 100) {
            throw new app_error_1.AppError('SCRATCH_BAD_ODDS', 'Odds must be 0–100.', 400);
        }
        if (odds.coinsPercent + odds.redeemPercent !== 100) {
            throw new app_error_1.AppError('SCRATCH_BAD_ODDS', 'Coins % + Redeem % must total 100.', 400);
        }
        if (odds.coinAmount < 0 || odds.coinAmount > 100_000) {
            throw new app_error_1.AppError('SCRATCH_BAD_AMOUNT', 'Invalid coin amount.', 400);
        }
    }
    assertPrizes(prizes) {
        if (prizes.length > 200) {
            throw new app_error_1.AppError('SCRATCH_PRIZE_LIMIT', 'Too many prizes.', 400);
        }
        const ids = new Set();
        for (const p of prizes) {
            const id = this.sanitizeId(p.id, 'prize');
            if (ids.has(id)) {
                throw new app_error_1.AppError('SCRATCH_DUP_PRIZE', `Duplicate prize id: ${id}`, 400);
            }
            ids.add(id);
            if (p.kind === 'MILESTONE' && (p.streakDays == null || p.streakDays < 1)) {
                throw new app_error_1.AppError('SCRATCH_BAD_MILESTONE', 'Milestone prizes need streak days.', 400);
            }
        }
    }
};
exports.ScratchService = ScratchService;
exports.ScratchService = ScratchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        economy_service_1.EconomyService,
        redeem_service_1.RedeemService,
        analytics_service_1.AnalyticsService])
], ScratchService);
//# sourceMappingURL=scratch.service.js.map