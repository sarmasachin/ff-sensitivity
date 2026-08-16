import { Injectable } from '@nestjs/common';
import { Prisma, ScratchPrizeKind, ScratchRollOutcome } from '@prisma/client';
import { randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import { EconomyService } from '../economy/economy.service';
import { RedeemService } from '../redeem/redeem.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { utcDateKey } from '../economy/economy-catalog';
import { assertOutcomeOdds, ensureScratchDefaults } from './scratch-shared';

@Injectable()
export class ScratchUserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly economy: EconomyService,
    private readonly redeem: RedeemService,
    private readonly analytics: AnalyticsService,
  ) {}

  async userConfig(userId: string) {
    await ensureScratchDefaults(this.prisma);
    await this.economy.requireUserPublic(userId);
    const day = utcDateKey();
    const [config, gifts, rollsToday, challengeCfg, user] = await Promise.all([
      this.prisma.scratchConfig.findUniqueOrThrow({ where: { id: 'default' } }),
      this.prisma.scratchPrize.findMany({
        where: { enabled: true, kind: ScratchPrizeKind.GIFT },
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

  async userRoll(userId: string) {
    await ensureScratchDefaults(this.prisma);
    await this.economy.requireUserPublic(userId);
    const day = utcDateKey();

    const [config, challengeCfg, user, rollsToday] = await Promise.all([
      this.prisma.scratchConfig.findUniqueOrThrow({ where: { id: 'default' } }),
      this.prisma.challengeConfig.findUnique({ where: { id: 'default' } }),
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { lastCheckinDay: true },
      }),
      this.prisma.scratchRoll.count({ where: { userId, dayKey: day } }),
    ]);

    if (user.lastCheckinDay !== day) {
      throw new AppError(
        'SCRATCH_CHECKIN_REQUIRED',
        'Complete today’s check-in before scratching.',
        409,
      );
    }

    const cardsPerDay = Math.max(1, Math.min(20, challengeCfg?.scratchCardsPerDay ?? 1));
    if (rollsToday >= cardsPerDay) {
      throw new AppError('SCRATCH_LIMIT', 'No scratch cards left today.', 409);
    }

    this.assertOdds(config);
    const slot = rollsToday;
    const wantCoins = randomInt(0, 100) < config.coinsPercent;
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

  private assertOdds(config: {
    coinsPercent: number;
    redeemPercent: number;
    coinAmount: number;
  }) {
    assertOutcomeOdds({
      coinsPercent: config.coinsPercent,
      redeemPercent: config.redeemPercent,
      coinAmount: config.coinAmount,
    });
  }

  private async finishCoinsRoll(
    userId: string,
    day: string,
    slot: number,
    config: { coinAmount: number },
  ) {
    await this.reserveRollSlot(userId, day, slot);
    const gifts = await this.prisma.scratchPrize.findMany({
      where: { enabled: true, kind: ScratchPrizeKind.GIFT },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    const picked = this.weightedPick(gifts);
    const coinDelta = picked?.coinReward ?? config.coinAmount;
    const title = picked?.title ?? 'Lucky Coins';
    const rewardLabel = picked?.rewardLabel ?? `+${coinDelta} coins`;
    const prizeId = picked?.id ?? null;
    const earn = await this.economy.earnScratchCoins(userId, day, slot, coinDelta);
    await this.prisma.scratchRoll.update({
      where: { userId_dayKey_slot: { userId, dayKey: day, slot } },
      data: {
        outcome: ScratchRollOutcome.COINS,
        prizeId,
        coinDelta: earn.delta,
        title,
        rewardLabel,
        redeemCodeId: null,
      },
    });
    return {
      outcome: 'COINS' as const,
      alreadyApplied: earn.alreadyApplied,
      coins: earn.coins,
      coinDelta: earn.delta,
      prizeId,
      title,
      rewardLabel,
      redeemCodeId: null as string | null,
      code: null as string | null,
    };
  }

  private async finishRedeemRoll(
    userId: string,
    day: string,
    slot: number,
    config: { coinAmount: number },
  ) {
    const free = await this.prisma.redeemCode.findFirst({
      where: {
        status: 'ACTIVE',
        stockLeft: 1,
        OR: [{ coinCost: null }, { coinCost: 0 }],
      },
      orderBy: { createdAt: 'asc' },
    });
    if (!free) {
      return this.finishCoinsRoll(userId, day, slot, config);
    }
    await this.reserveRollSlot(userId, day, slot);
    let claimed: { code: string; alreadyClaimed?: boolean };
    try {
      claimed = await this.redeem.claim(userId, free.id);
    } catch {
      return this.completeReservedAsCoins(userId, day, slot, config.coinAmount);
    }
    await this.prisma.scratchRoll.update({
      where: { userId_dayKey_slot: { userId, dayKey: day, slot } },
      data: {
        outcome: ScratchRollOutcome.REDEEM,
        prizeId: null,
        coinDelta: 0,
        redeemCodeId: free.id,
        title: free.title,
        rewardLabel: free.valueLabel,
      },
    });
    const wallet = await this.economy.getWallet(userId);
    return {
      outcome: 'REDEEM' as const,
      alreadyApplied: !!claimed.alreadyClaimed,
      coins: wallet.coins,
      coinDelta: 0,
      prizeId: null as string | null,
      title: free.title,
      rewardLabel: free.valueLabel,
      redeemCodeId: free.id,
      code: claimed.code as string,
    };
  }

  private async reserveRollSlot(userId: string, day: string, slot: number) {
    try {
      await this.prisma.scratchRoll.create({
        data: {
          userId,
          dayKey: day,
          slot,
          outcome: ScratchRollOutcome.COINS,
          coinDelta: 0,
          title: 'pending',
          rewardLabel: 'pending',
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new AppError('SCRATCH_LIMIT', 'No scratch cards left today.', 409);
      }
      throw e;
    }
  }

  private async completeReservedAsCoins(
    userId: string,
    day: string,
    slot: number,
    coinAmount: number,
  ) {
    const earn = await this.economy.earnScratchCoins(userId, day, slot, coinAmount);
    const title = 'Lucky Coins';
    const rewardLabel = `+${earn.delta} coins`;
    await this.prisma.scratchRoll.update({
      where: { userId_dayKey_slot: { userId, dayKey: day, slot } },
      data: {
        outcome: ScratchRollOutcome.COINS,
        prizeId: null,
        coinDelta: earn.delta,
        title,
        rewardLabel,
        redeemCodeId: null,
      },
    });
    return {
      outcome: 'COINS' as const,
      alreadyApplied: earn.alreadyApplied,
      coins: earn.coins,
      coinDelta: earn.delta,
      prizeId: null as string | null,
      title,
      rewardLabel,
      redeemCodeId: null as string | null,
      code: null as string | null,
    };
  }

  private weightedPick<
    T extends {
      id: string;
      oddsPercent: number;
      coinReward: number;
      title: string;
      rewardLabel: string;
    },
  >(rows: T[]): T | null {
    if (!rows.length) return null;
    const weights = rows.map((r) => Math.max(0, r.oddsPercent));
    const sum = weights.reduce((a, b) => a + b, 0);
    if (sum <= 0) return rows[0] ?? null;
    let tick = randomInt(0, Math.ceil(sum * 10)) / 10;
    for (let i = 0; i < rows.length; i++) {
      tick -= weights[i];
      if (tick < 0) return rows[i] ?? null;
    }
    return rows[rows.length - 1] ?? null;
  }
}
