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
exports.EconomyAdminService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const app_error_1 = require("../common/errors/app-error");
const challenge_shared_1 = require("../challenge/challenge-shared");
const premium_unlock_prices_1 = require("./premium-unlock-prices");
let EconomyAdminService = class EconomyAdminService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getConfig() {
        await (0, challenge_shared_1.ensureChallengeDefaults)(this.prisma);
        const row = await this.prisma.challengeConfig.findUniqueOrThrow({
            where: { id: challenge_shared_1.CONFIG_ID },
        });
        return this.toConfig(row);
    }
    async saveConfig(admin, dto) {
        if (admin.role === client_1.AdminRole.VIEWER) {
            throw new app_error_1.AppError('FORBIDDEN_ROLE', 'Viewers cannot change economy.', 403);
        }
        await (0, challenge_shared_1.ensureChallengeDefaults)(this.prisma);
        const quizWrong = dto.earn.quizWrongCoins === 0 ? 0 : -Math.abs(dto.earn.quizWrongCoins);
        const best = (0, premium_unlock_prices_1.clampPremiumUnlockCoins)(dto.premiumUnlock.bestPremium);
        const proMax = (0, premium_unlock_prices_1.clampPremiumUnlockCoins)(dto.premiumUnlock.premiumProMax);
        const oneTap = (0, premium_unlock_prices_1.clampPremiumUnlockCoins)(dto.premiumUnlock.oneTapPremium);
        const coinUnlockEnabled = !!dto.premiumUnlock.coinUnlockEnabled;
        const adUnlockEnabled = !!dto.premiumUnlock.adUnlockEnabled;
        if (!coinUnlockEnabled && !adUnlockEnabled) {
            throw new app_error_1.AppError('ECONOMY_PREMIUM_UNLOCK_PATH', 'Enable at least one Premium unlock path (coins or watch ad).', 400);
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.challengeConfig.update({
                where: { id: challenge_shared_1.CONFIG_ID },
                data: {
                    checkinCoins: dto.earn.checkInCoins,
                    quizCorrectCoins: dto.earn.quizCorrectCoins,
                    quizWrongCoins: quizWrong,
                    adBonusCoins: dto.earn.adBonusCoins,
                    adBonusOptional: dto.adBonusEnabled,
                    walletCap: dto.limits.walletCap,
                    dailyEarnCap: dto.limits.dailyEarnCap,
                    checkInEnabled: dto.checkInEnabled,
                    quizEnabled: dto.quizEnabled,
                    premiumUnlockBestCoins: best,
                    premiumUnlockProMaxCoins: proMax,
                    premiumUnlockOneTapCoins: oneTap,
                    premiumUnlockCoinEnabled: coinUnlockEnabled,
                    premiumUnlockAdEnabled: adUnlockEnabled,
                },
            });
            await tx.auditLog.create({
                data: {
                    actorAdminId: admin.id,
                    action: 'economy.save',
                    entity: 'challenge_config:default',
                    afterJson: {
                        checkInCoins: dto.earn.checkInCoins,
                        quizCorrectCoins: dto.earn.quizCorrectCoins,
                        quizWrongCoins: quizWrong,
                        adBonusCoins: dto.earn.adBonusCoins,
                        walletCap: dto.limits.walletCap,
                        dailyEarnCap: dto.limits.dailyEarnCap,
                        checkInEnabled: dto.checkInEnabled,
                        quizEnabled: dto.quizEnabled,
                        adBonusEnabled: dto.adBonusEnabled,
                        premiumUnlockBestCoins: best,
                        premiumUnlockProMaxCoins: proMax,
                        premiumUnlockOneTapCoins: oneTap,
                        premiumUnlockCoinEnabled: coinUnlockEnabled,
                        premiumUnlockAdEnabled: adUnlockEnabled,
                    },
                },
            });
        });
        return this.getConfig();
    }
    toConfig(row) {
        return {
            earn: {
                checkInCoins: row.checkinCoins,
                quizCorrectCoins: row.quizCorrectCoins,
                quizWrongCoins: Math.abs(row.quizWrongCoins),
                adBonusCoins: row.adBonusCoins,
            },
            limits: {
                walletCap: row.walletCap,
                dailyEarnCap: row.dailyEarnCap,
            },
            premiumUnlock: {
                bestPremium: (0, premium_unlock_prices_1.clampPremiumUnlockCoins)(row.premiumUnlockBestCoins ??
                    premium_unlock_prices_1.PREMIUM_UNLOCK_DEFAULT_COINS.best_premium),
                premiumProMax: (0, premium_unlock_prices_1.clampPremiumUnlockCoins)(row.premiumUnlockProMaxCoins ??
                    premium_unlock_prices_1.PREMIUM_UNLOCK_DEFAULT_COINS.premium_pro_max),
                oneTapPremium: (0, premium_unlock_prices_1.clampPremiumUnlockCoins)(row.premiumUnlockOneTapCoins ??
                    premium_unlock_prices_1.PREMIUM_UNLOCK_DEFAULT_COINS.one_tap_premium),
                coinUnlockEnabled: row.premiumUnlockCoinEnabled ?? true,
                adUnlockEnabled: row.premiumUnlockAdEnabled ?? true,
            },
            checkInEnabled: row.checkInEnabled,
            quizEnabled: row.quizEnabled,
            adBonusEnabled: row.adBonusOptional,
        };
    }
};
exports.EconomyAdminService = EconomyAdminService;
exports.EconomyAdminService = EconomyAdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EconomyAdminService);
//# sourceMappingURL=economy-admin.service.js.map