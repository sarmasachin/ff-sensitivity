import { Injectable } from '@nestjs/common';
import { AdminRole, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import {
  CONFIG_ID,
  ensureChallengeDefaults,
} from '../challenge/challenge-shared';
import type { SaveEconomyDto } from './dto/economy-admin.dto';
import {
  clampPremiumUnlockCoins,
  PREMIUM_UNLOCK_DEFAULT_COINS,
} from './premium-unlock-prices';

@Injectable()
export class EconomyAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig() {
    await ensureChallengeDefaults(this.prisma);
    const row = await this.prisma.challengeConfig.findUniqueOrThrow({
      where: { id: CONFIG_ID },
    });
    return this.toConfig(row);
  }

  async saveConfig(admin: AuthAdmin, dto: SaveEconomyDto) {
    if (admin.role === AdminRole.VIEWER) {
      throw new AppError('FORBIDDEN_ROLE', 'Viewers cannot change economy.', 403);
    }
    await ensureChallengeDefaults(this.prisma);
    const quizWrong =
      dto.earn.quizWrongCoins === 0 ? 0 : -Math.abs(dto.earn.quizWrongCoins);
    const best = clampPremiumUnlockCoins(dto.premiumUnlock.bestPremium);
    const proMax = clampPremiumUnlockCoins(dto.premiumUnlock.premiumProMax);
    const oneTap = clampPremiumUnlockCoins(dto.premiumUnlock.oneTapPremium);
    const coinUnlockEnabled = !!dto.premiumUnlock.coinUnlockEnabled;
    const adUnlockEnabled = !!dto.premiumUnlock.adUnlockEnabled;
    if (!coinUnlockEnabled && !adUnlockEnabled) {
      throw new AppError(
        'ECONOMY_PREMIUM_UNLOCK_PATH',
        'Enable at least one Premium unlock path (coins or watch ad).',
        400,
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.challengeConfig.update({
        where: { id: CONFIG_ID },
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
          } as Prisma.InputJsonValue,
        },
      });
    });
    return this.getConfig();
  }

  private toConfig(row: {
    checkinCoins: number;
    quizCorrectCoins: number;
    quizWrongCoins: number;
    adBonusCoins: number;
    walletCap: number;
    dailyEarnCap: number;
    checkInEnabled: boolean;
    quizEnabled: boolean;
    adBonusOptional: boolean;
    premiumUnlockBestCoins?: number | null;
    premiumUnlockProMaxCoins?: number | null;
    premiumUnlockOneTapCoins?: number | null;
    premiumUnlockCoinEnabled?: boolean | null;
    premiumUnlockAdEnabled?: boolean | null;
  }) {
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
        bestPremium: clampPremiumUnlockCoins(
          row.premiumUnlockBestCoins ??
            PREMIUM_UNLOCK_DEFAULT_COINS.best_premium,
        ),
        premiumProMax: clampPremiumUnlockCoins(
          row.premiumUnlockProMaxCoins ??
            PREMIUM_UNLOCK_DEFAULT_COINS.premium_pro_max,
        ),
        oneTapPremium: clampPremiumUnlockCoins(
          row.premiumUnlockOneTapCoins ??
            PREMIUM_UNLOCK_DEFAULT_COINS.one_tap_premium,
        ),
        coinUnlockEnabled: row.premiumUnlockCoinEnabled ?? true,
        adUnlockEnabled: row.premiumUnlockAdEnabled ?? true,
      },
      checkInEnabled: row.checkInEnabled,
      quizEnabled: row.quizEnabled,
      adBonusEnabled: row.adBonusOptional,
    };
  }
}
