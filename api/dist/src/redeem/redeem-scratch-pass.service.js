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
exports.RedeemScratchPassService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const analytics_service_1 = require("../analytics/analytics.service");
const app_error_1 = require("../common/errors/app-error");
const redeem_scratch_math_1 = require("./redeem-scratch-math");
const redeem_scratch_guards_1 = require("./redeem-scratch-guards");
let RedeemScratchPassService = class RedeemScratchPassService {
    prisma;
    analytics;
    constructor(prisma, analytics) {
        this.prisma = prisma;
        this.analytics = analytics;
    }
    async adUnlock(userId, redeemCodeId) {
        await (0, redeem_scratch_guards_1.assertRedeemSeat)(this.prisma, userId);
        const code = await this.prisma.redeemCode.findUnique({
            where: { id: redeemCodeId },
        });
        if (!code) {
            throw new app_error_1.AppError('REDEEM_NOT_FOUND', 'Card not found.', 404);
        }
        if (code.mode !== client_1.RedeemMode.SCRATCH_REWARD) {
            throw new app_error_1.AppError('REDEEM_WRONG_MODE', 'This card is not a scratch-reward card.', 409);
        }
        const now = new Date();
        (0, redeem_scratch_guards_1.assertScratchCardOpen)(code, now);
        const window = (0, redeem_scratch_math_1.scratchWindowRange)(code.startsAt ?? code.createdAt, code.windowMinutes, now);
        if (!window) {
            throw new app_error_1.AppError('REDEEM_NOT_STARTED', 'This scratch card has not started yet.', 409);
        }
        const last = await this.prisma.redeemScratchRoll.findFirst({
            where: { userId, redeemCodeId },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
        });
        const locked = !!last &&
            (0, redeem_scratch_math_1.isScratchCooldownActive)(last.createdAt, code.windowMinutes, now);
        const totalUsed = await this.prisma.redeemScratchRoll.count({
            where: { userId, redeemCodeId },
        });
        const pass = await this.prisma.redeemScratchPass.findUnique({
            where: { userId_redeemCodeId: { userId, redeemCodeId } },
        });
        const allowed = pass?.allowedAttempts ?? 1;
        if (locked) {
            return {
                ok: true,
                alreadyAllowed: true,
                allowedAttempts: allowed,
                usedAttempts: totalUsed,
                needsAd: false,
            };
        }
        if (totalUsed < allowed) {
            return {
                ok: true,
                alreadyAllowed: true,
                allowedAttempts: allowed,
                usedAttempts: totalUsed,
                needsAd: false,
            };
        }
        const next = await this.prisma.redeemScratchPass.upsert({
            where: { userId_redeemCodeId: { userId, redeemCodeId } },
            create: {
                userId,
                redeemCodeId,
                allowedAttempts: totalUsed + 1,
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
            usedAttempts: totalUsed,
            needsAd: false,
        };
    }
    async scratchMeta(userId, redeemCodeId) {
        const empty = {
            usedAttempts: 0,
            allowedAttempts: 1,
            needsAd: false,
            canScratch: false,
            waitUntil: null,
            waitNext: null,
        };
        const code = await this.prisma.redeemCode.findUnique({
            where: { id: redeemCodeId },
        });
        if (!code || code.mode !== client_1.RedeemMode.SCRATCH_REWARD)
            return empty;
        const now = new Date();
        const window = (0, redeem_scratch_math_1.scratchWindowRange)(code.startsAt ?? code.createdAt, code.windowMinutes, now);
        if (!window) {
            const start = code.startsAt;
            if (start && start.getTime() > now.getTime()) {
                return {
                    ...empty,
                    waitUntil: start.toISOString(),
                    waitNext: 'SCRATCH',
                };
            }
            return empty;
        }
        const last = await this.prisma.redeemScratchRoll.findFirst({
            where: { userId, redeemCodeId },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
        });
        const locked = !!last &&
            (0, redeem_scratch_math_1.isScratchCooldownActive)(last.createdAt, code.windowMinutes, now);
        const totalUsed = await this.prisma.redeemScratchRoll.count({
            where: { userId, redeemCodeId },
        });
        const pass = await this.prisma.redeemScratchPass.findUnique({
            where: { userId_redeemCodeId: { userId, redeemCodeId } },
        });
        const allowed = pass?.allowedAttempts ?? 1;
        if (locked && last) {
            const waitMs = Math.max(1, code.windowMinutes) * 60_000;
            return {
                usedAttempts: totalUsed,
                allowedAttempts: allowed,
                needsAd: false,
                canScratch: false,
                waitUntil: new Date(last.createdAt.getTime() + waitMs).toISOString(),
                waitNext: totalUsed >= allowed ? 'AD' : 'SCRATCH',
            };
        }
        const needsAd = totalUsed >= allowed;
        return {
            usedAttempts: totalUsed,
            allowedAttempts: allowed,
            needsAd,
            canScratch: !needsAd,
            waitUntil: null,
            waitNext: null,
        };
    }
};
exports.RedeemScratchPassService = RedeemScratchPassService;
exports.RedeemScratchPassService = RedeemScratchPassService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        analytics_service_1.AnalyticsService])
], RedeemScratchPassService);
//# sourceMappingURL=redeem-scratch-pass.service.js.map