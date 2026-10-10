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
      checkInEnabled: row.checkInEnabled,
      quizEnabled: row.quizEnabled,
      adBonusEnabled: row.adBonusOptional,
    };
  }
}
