import { Injectable } from '@nestjs/common';
import { Prisma, ScratchPrizeKind, ScratchRollOutcome } from '@prisma/client';
import { randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import { EconomyService } from '../economy/economy.service';
import { RedeemService } from '../redeem/redeem.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { utcDateKey } from '../economy/economy-catalog';
import type { SaveScratchDto, ScratchPrizeDto } from './dto/scratch.dto';

// --- Start: Scratch live wire (Sachin) ---
const CONFIG_ID = 'default';

const DEFAULT_CONFIG = {
  coinsPercent: 55,
  redeemPercent: 45,
  coinAmount: 50,
  retentionDays: 30,
  autoPurge: true,
  showExpired: false,
};

@Injectable()
export class ScratchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly economy: EconomyService,
    private readonly redeem: RedeemService,
    private readonly analytics: AnalyticsService,
  ) {}

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

  async adminSave(adminId: string, dto: SaveScratchDto) {
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
            kind: p.kind as ScratchPrizeKind,
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
          } as Prisma.InputJsonValue,
        },
      });
    });

    return this.adminGetBundle();
  }

  async userConfig(userId: string) {
    await this.ensureDefaults();
    await this.economy.requireUserPublic(userId);
    const day = utcDateKey();
    const [config, gifts, rollsToday, challengeCfg, user] = await Promise.all([
      this.prisma.scratchConfig.findUniqueOrThrow({ where: { id: CONFIG_ID } }),
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
      // Public gift teasers — no need to hide odds (server still rolls).
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
    await this.ensureDefaults();
    await this.economy.requireUserPublic(userId);
    const day = utcDateKey();

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
      throw new AppError(
        'SCRATCH_CHECKIN_REQUIRED',
        'Complete today’s check-in before scratching.',
        409,
      );
    }

    const cardsPerDay = Math.max(1, Math.min(20, challengeCfg?.scratchCardsPerDay ?? 1));
    if (rollsToday >= cardsPerDay) {
      throw new AppError(
        'SCRATCH_LIMIT',
        'No scratch cards left today.',
        409,
      );
    }

    this.assertOutcomeOdds({
      coinsPercent: config.coinsPercent,
      redeemPercent: config.redeemPercent,
      coinAmount: config.coinAmount,
    });

    const slot = rollsToday;
    const rollPick = randomInt(0, 100); // 0..99
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

  private async finishCoinsRoll(
    userId: string,
    day: string,
    slot: number,
    config: {
      coinAmount: number;
      coinsPercent: number;
      redeemPercent: number;
    },
  ) {
    // Reserve unique slot BEFORE payout — prevents double-roll races.
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
      where: {
        userId_dayKey_slot: { userId, dayKey: day, slot },
      },
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
    // Prefer a free ACTIVE code with stock — claim server-side (no client forge).
    const free = await this.prisma.redeemCode.findFirst({
      where: {
        status: 'ACTIVE',
        stockLeft: 1,
        OR: [{ coinCost: null }, { coinCost: 0 }],
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!free) {
      // Fallback to coins when redeem stock is empty (fair UX, audited as COINS).
      return this.finishCoinsRoll(userId, day, slot, {
        ...config,
        coinsPercent: 100,
        redeemPercent: 0,
      });
    }

    // Reserve slot before claim so a failed unique create cannot leave a free re-roll
    // after stock/code was already consumed.
    await this.reserveRollSlot(userId, day, slot);

    let claimed: { code: string; alreadyClaimed?: boolean };
    try {
      claimed = await this.redeem.claim(userId, free.id);
    } catch (e) {
      // Claim failed after reserve — convert this slot to coins so user is not stuck.
      return this.completeReservedAsCoins(userId, day, slot, config.coinAmount);
    }

    await this.prisma.scratchRoll.update({
      where: {
        userId_dayKey_slot: { userId, dayKey: day, slot },
      },
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

  /** Insert placeholder roll; unique(user,day,slot) is the concurrency lock. */
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
    const earn = await this.economy.earnScratchCoins(
      userId,
      day,
      slot,
      coinAmount,
    );
    const title = 'Lucky Coins';
    const rewardLabel = `+${earn.delta} coins`;
    await this.prisma.scratchRoll.update({
      where: {
        userId_dayKey_slot: { userId, dayKey: day, slot },
      },
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
    T extends { id: string; oddsPercent: number; coinReward: number; title: string; rewardLabel: string },
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

  private mapPrize(p: {
    id: string;
    title: string;
    detail: string;
    kind: ScratchPrizeKind;
    rewardLabel: string;
    coinReward: number;
    oddsPercent: number;
    enabled: boolean;
    streakDays: number | null;
  }) {
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

  private sanitizeId(raw: string, fallback: string): string {
    const id = (raw?.trim() || fallback)
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 64);
    if (!id || id.includes('/')) {
      throw new AppError('SCRATCH_BAD_ID', 'Invalid prize id.', 400);
    }
    return id;
  }

  private assertOutcomeOdds(odds: {
    coinsPercent: number;
    redeemPercent: number;
    coinAmount: number;
  }) {
    if (
      odds.coinsPercent < 0 ||
      odds.redeemPercent < 0 ||
      odds.coinsPercent > 100 ||
      odds.redeemPercent > 100
    ) {
      throw new AppError('SCRATCH_BAD_ODDS', 'Odds must be 0–100.', 400);
    }
    if (odds.coinsPercent + odds.redeemPercent !== 100) {
      throw new AppError(
        'SCRATCH_BAD_ODDS',
        'Coins % + Redeem % must total 100.',
        400,
      );
    }
    if (odds.coinAmount < 0 || odds.coinAmount > 100_000) {
      throw new AppError('SCRATCH_BAD_AMOUNT', 'Invalid coin amount.', 400);
    }
  }

  private assertPrizes(prizes: ScratchPrizeDto[]) {
    if (prizes.length > 200) {
      throw new AppError('SCRATCH_PRIZE_LIMIT', 'Too many prizes.', 400);
    }
    const ids = new Set<string>();
    for (const p of prizes) {
      const id = this.sanitizeId(p.id, 'prize');
      if (ids.has(id)) {
        throw new AppError('SCRATCH_DUP_PRIZE', `Duplicate prize id: ${id}`, 400);
      }
      ids.add(id);
      if (p.kind === 'MILESTONE' && (p.streakDays == null || p.streakDays < 1)) {
        throw new AppError(
          'SCRATCH_BAD_MILESTONE',
          'Milestone prizes need streak days.',
          400,
        );
      }
    }
  }
}
// --- End: Scratch live wire (Sachin) ---
