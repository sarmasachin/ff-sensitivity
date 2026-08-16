import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { SaveScratchDto } from './dto/scratch.dto';
import {
  CONFIG_ID,
  DEFAULT_CONFIG,
  assertOutcomeOdds,
  assertPrizes,
  ensureScratchDefaults,
  mapPrize,
  prizeWriteData,
} from './scratch-shared';

@Injectable()
export class ScratchService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureDefaults() {
    await ensureScratchDefaults(this.prisma);
  }

  async adminGetBundle() {
    await ensureScratchDefaults(this.prisma);
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
      prizes: prizes.map((p) => mapPrize(p)),
    };
  }

  async adminSave(adminId: string, dto: SaveScratchDto) {
    assertOutcomeOdds(dto.outcomeOdds);
    if (dto.prizes !== undefined) assertPrizes(dto.prizes);

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
          ...DEFAULT_CONFIG,
          coinsPercent: dto.outcomeOdds.coinsPercent,
          redeemPercent: dto.outcomeOdds.redeemPercent,
          coinAmount: dto.outcomeOdds.coinAmount,
          retentionDays: dto.policy.retentionDays,
          autoPurge: dto.policy.autoPurge,
          showExpired: dto.policy.showExpired,
        },
      });

      if (dto.prizes !== undefined) {
        await tx.scratchPrize.deleteMany({});
        if (dto.prizes.length) {
          await tx.scratchPrize.createMany({
            data: dto.prizes.map((p, i) => prizeWriteData(p, i)),
          });
        }
      }

      await tx.auditLog.create({
        data: {
          actorAdminId: adminId,
          action: 'scratch.save',
          entity: 'scratch_config:default',
          afterJson: {
            prizeCount: dto.prizes?.length ?? null,
            coinsPercent: dto.outcomeOdds.coinsPercent,
            redeemPercent: dto.outcomeOdds.redeemPercent,
          } as Prisma.InputJsonValue,
        },
      });
    });

    return this.adminGetBundle();
  }
}
