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
exports.RedeemCatalogService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const redeem_mask_1 = require("./redeem-mask");
const redeem_scratch_service_1 = require("./redeem-scratch.service");
let RedeemCatalogService = class RedeemCatalogService {
    prisma;
    scratchService;
    constructor(prisma, scratchService) {
        this.prisma = prisma;
        this.scratchService = scratchService;
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
            include: {
                _count: {
                    select: {
                        secrets: { where: { status: client_1.RedeemSecretStatus.UNUSED } },
                    },
                },
            },
        });
        const claims = await this.prisma.redeemClaim.findMany({
            where: { userId },
            select: { redeemCodeId: true, codeSecret: true },
        });
        const claimMap = new Map(claims.map((c) => [c.redeemCodeId, c.codeSecret]));
        const scratchIds = codes
            .filter((c) => c.mode === client_1.RedeemMode.SCRATCH_REWARD)
            .map((c) => c.id);
        const scratchMeta = new Map();
        await Promise.all(scratchIds.map(async (id) => {
            scratchMeta.set(id, await this.scratchService.scratchMeta(userId, id));
        }));
        const [types, cadences] = await Promise.all([
            this.prisma.redeemTypeDef.findMany({
                where: { enabled: true },
                orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            }),
            this.prisma.redeemCadenceDef.findMany({
                where: { enabled: true },
                orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            }),
        ]);
        return {
            types: types.map((t) => ({ id: t.id, label: t.label })),
            cadences: cadences.map((c) => ({
                id: c.id,
                label: c.label,
                claimLimit: c.claimLimit,
                windowHours: c.windowHours,
            })),
            items: codes.map((row) => {
                const mine = claimMap.get(row.id);
                const claimedByMe = Boolean(mine);
                const expiredByTime = row.expiresAt != null && row.expiresAt.getTime() <= now.getTime();
                const scheduleEnded = row.endsAt != null && row.endsAt.getTime() <= now.getTime();
                const scheduleNotStarted = row.startsAt != null && row.startsAt.getTime() > now.getTime();
                if (row.mode === client_1.RedeemMode.SCRATCH_REWARD) {
                    const poolLeft = row._count.secrets;
                    const meta = scratchMeta.get(row.id) ?? {
                        usedAttempts: 0,
                        allowedAttempts: 1,
                        needsAd: false,
                        canScratch: true,
                    };
                    const listStatus = expiredByTime ||
                        scheduleEnded ||
                        row.status === client_1.RedeemCodeStatus.EXPIRED
                        ? 'CLAIMED'
                        : row.status === client_1.RedeemCodeStatus.PAUSED || scheduleNotStarted
                            ? 'CLAIMED'
                            : row.status === client_1.RedeemCodeStatus.ACTIVE
                                ? 'ACTIVE'
                                : 'CLAIMED';
                    return {
                        id: row.id,
                        type: row.type,
                        title: row.title,
                        valueLabel: row.valueLabel,
                        codeMasked: mine ? (0, redeem_mask_1.maskRedeemCode)(mine) : '••••-COINS',
                        code: claimedByMe ? mine : null,
                        status: listStatus,
                        expiresLabel: row.expiresLabel,
                        tip: row.tip?.trim() || redeem_scratch_service_1.RedeemScratchService.SAFE_TIP,
                        redeemUrl: row.redeemUrl,
                        stockLeft: poolLeft,
                        coinCost: null,
                        cadence: row.cadence,
                        unlocked: claimedByMe,
                        mode: row.mode,
                        coinRewardMin: row.coinRewardMin,
                        coinRewardMax: row.coinRewardMax,
                        startsAt: row.startsAt?.toISOString() ?? null,
                        endsAt: row.endsAt?.toISOString() ?? null,
                        windowMinutes: row.windowMinutes,
                        codesPerWindow: row.codesPerWindow,
                        poolLeft,
                        needsAd: meta.needsAd,
                        canScratch: meta.canScratch && listStatus === 'ACTIVE',
                    };
                }
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
                    mode: row.mode,
                    coinRewardMin: null,
                    coinRewardMax: null,
                    startsAt: null,
                    endsAt: null,
                    windowMinutes: row.windowMinutes,
                    codesPerWindow: row.codesPerWindow,
                    poolLeft: null,
                    needsAd: false,
                    canScratch: false,
                };
            }),
        };
    }
};
exports.RedeemCatalogService = RedeemCatalogService;
exports.RedeemCatalogService = RedeemCatalogService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redeem_scratch_service_1.RedeemScratchService])
], RedeemCatalogService);
//# sourceMappingURL=redeem-catalog.service.js.map