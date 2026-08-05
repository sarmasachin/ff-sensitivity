import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import {
  BOOST_CHECKIN,
  BOOST_QUIZ,
  ECONOMY_AMOUNTS,
  MILESTONE_REWARDS,
  SHOP_CATALOG,
  utcDateKey,
} from './economy-catalog';

// --- Start: Economy live wire (Sachin) ---
@Injectable()
export class EconomyService {
  constructor(private readonly prisma: PrismaService) {}

  async getWallet(userId: string) {
    const user = await this.requireUser(userId);
    const boosts = await this.prisma.userBoostCharge.findMany({
      where: { userId, charges: { gt: 0 } },
    });
    return {
      coins: user.coins,
      frozen: user.walletFrozen,
      boosts: Object.fromEntries(boosts.map((b) => [b.boostId, b.charges])),
    };
  }

  async earnChallenge(
    userId: string,
    kind: 'CHECKIN' | 'QUIZ' | 'AD' | 'MILESTONE',
    opts: { correct?: boolean; milestoneDays?: number },
  ) {
    const user = await this.requireUser(userId);
    this.assertNotFrozen(user);
    const day = utcDateKey();

    switch (kind) {
      case 'CHECKIN':
        return this.earnCheckin(userId, day);
      case 'QUIZ':
        // Client-attested `correct` is forgeable — quiz must go through Challenge submit.
        throw new AppError(
          'ECONOMY_QUIZ_MOVED',
          'Submit quiz via /api/v1/challenge/quiz/submit.',
          400,
        );
      case 'AD':
        return this.earnAd(userId, day);
      case 'MILESTONE':
        return this.earnMilestone(userId, opts.milestoneDays);
      default:
        throw new AppError('ECONOMY_INVALID', 'Unknown earn kind.', 400);
    }
  }

  async purchaseShop(userId: string, itemId: string, requestId: string) {
    const user = await this.requireUser(userId);
    this.assertNotFrozen(user);
    const item = SHOP_CATALOG[itemId];
    if (!item || !item.enabled) {
      throw new AppError('SHOP_ITEM_NOT_FOUND', 'Item not found.', 404);
    }
    const safeReq = requestId.trim();
    if (safeReq.length < 8 || safeReq.length > 80) {
      throw new AppError('SHOP_BAD_REQUEST', 'Invalid request id.', 400);
    }

    const buyKeyBase = `shop:${userId}:${itemId}`;
    if (item.oneTime) {
      const prior = await this.prisma.walletLedger.findFirst({
        where: { userId, reason: `shop:${itemId}` },
      });
      if (prior) {
        throw new AppError('SHOP_ALREADY_OWNED', 'Already owned.', 409);
      }
    }

    if (item.stockLimit != null) {
      const buys = await this.prisma.walletLedger.count({
        where: { userId, reason: `shop:${itemId}` },
      });
      if (buys >= item.stockLimit) {
        throw new AppError('SHOP_OUT_OF_STOCK', 'Out of stock.', 409);
      }
    }

    const idempotencyKey = item.oneTime
      ? `${buyKeyBase}:once`
      : `${buyKeyBase}:req:${safeReq}`;

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.walletLedger.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        return {
          coins: existing.balanceAfter,
          itemId,
          alreadyApplied: true,
        };
      }

      const paid = await tx.user.updateMany({
        where: { id: userId, coins: { gte: item.priceCoins } },
        data: { coins: { decrement: item.priceCoins } },
      });
      if (paid.count !== 1) {
        throw new AppError(
          'NOT_ENOUGH_COINS',
          `You need ${item.priceCoins} coins.`,
          409,
        );
      }

      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      await tx.walletLedger.create({
        data: {
          userId,
          delta: -item.priceCoins,
          balanceAfter: user.coins,
          reason: `shop:${itemId}`,
          idempotencyKey,
        },
      });

      if (item.isBoost) {
        await tx.userBoostCharge.upsert({
          where: {
            userId_boostId: { userId, boostId: itemId },
          },
          create: { userId, boostId: itemId, charges: 1 },
          update: { charges: { increment: 1 } },
        });
      }

      return { coins: user.coins, itemId, alreadyApplied: false };
    });
  }

  /** Graded quiz earn — only ChallengeService may call (server scored). */
  async earnQuizGraded(
    userId: string,
    correct: boolean,
    amounts: { correctCoins: number; wrongCoins: number },
  ) {
    const user = await this.requireUser(userId);
    this.assertNotFrozen(user);
    const day = utcDateKey();
    return this.earnQuiz(userId, day, correct, amounts);
  }

  /** Daily scratch coin payout — only ScratchService may call. */
  async earnScratchCoins(
    userId: string,
    day: string,
    slot: number,
    amount: number,
  ) {
    const user = await this.requireUser(userId);
    this.assertNotFrozen(user);
    const safe = Math.max(0, Math.min(100_000, Math.floor(amount)));
    const key = `earn:scratch:${userId}:${day}:${slot}`;
    return this.applyEarn(userId, key, async () => ({
      delta: safe,
      reason: 'earn:scratch',
    }));
  }

  async requireUserPublic(userId: string) {
    return this.requireUser(userId);
  }

  private async earnCheckin(userId: string, day: string) {
    const key = `earn:checkin:${userId}:${day}`;
    return this.applyEarn(userId, key, async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      const yesterday = utcDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
      const streak =
        user.lastCheckinDay === yesterday
          ? user.streakDays + 1
          : user.lastCheckinDay === day
            ? user.streakDays
            : 1;
      await tx.user.update({
        where: { id: userId },
        data: { streakDays: streak, lastCheckinDay: day },
      });

      let delta = ECONOMY_AMOUNTS.checkin;
      let usedBoost = false;
      const boost = await tx.userBoostCharge.findUnique({
        where: {
          userId_boostId: { userId, boostId: BOOST_CHECKIN },
        },
      });
      if (boost && boost.charges > 0) {
        delta += ECONOMY_AMOUNTS.checkinBoostExtra;
        usedBoost = true;
        await tx.userBoostCharge.update({
          where: { id: boost.id },
          data: { charges: { decrement: 1 } },
        });
      }
      return { delta, reason: usedBoost ? 'earn:checkin:boost' : 'earn:checkin' };
    });
  }

  private async earnQuiz(
    userId: string,
    day: string,
    correct: boolean,
    amounts?: { correctCoins: number; wrongCoins: number },
  ) {
    const correctCoins = amounts?.correctCoins ?? ECONOMY_AMOUNTS.quizCorrect;
    const wrongCoins = amounts?.wrongCoins ?? ECONOMY_AMOUNTS.quizWrong;

    if (correct) {
      const key = `earn:quiz:ok:${userId}:${day}`;
      return this.applyEarn(userId, key, async (tx) => {
        let delta = correctCoins;
        let usedBoost = false;
        const boost = await tx.userBoostCharge.findUnique({
          where: {
            userId_boostId: { userId, boostId: BOOST_QUIZ },
          },
        });
        if (boost && boost.charges > 0) {
          delta = correctCoins * 2;
          usedBoost = true;
          await tx.userBoostCharge.update({
            where: { id: boost.id },
            data: { charges: { decrement: 1 } },
          });
        }
        return {
          delta,
          reason: usedBoost ? 'earn:quiz:ok:boost' : 'earn:quiz:ok',
        };
      });
    }

    // Wrong answers: allow at most 2 debit events per day (matches open window UX).
    const wrongCount = await this.prisma.walletLedger.count({
      where: {
        userId,
        reason: 'earn:quiz:wrong',
        idempotencyKey: { startsWith: `earn:quiz:wrong:${userId}:${day}:` },
      },
    });
    if (wrongCount >= 2) {
      throw new AppError(
        'ECONOMY_QUIZ_CLOSED',
        'Quiz closed for today.',
        409,
      );
    }
    const key = `earn:quiz:wrong:${userId}:${day}:${wrongCount + 1}`;
    return this.applyEarn(userId, key, async () => ({
      delta: wrongCoins,
      reason: 'earn:quiz:wrong',
    }));
  }

  private async earnAd(userId: string, day: string) {
    const key = `earn:ad:${userId}:${day}`;
    return this.applyEarn(userId, key, async () => ({
      delta: ECONOMY_AMOUNTS.adBonus,
      reason: 'earn:ad',
    }));
  }

  private async earnMilestone(userId: string, days?: number) {
    if (days == null || days < 1 || days > 365) {
      throw new AppError('ECONOMY_MILESTONE_INVALID', 'Unknown milestone.', 400);
    }
    const fromDb = await this.prisma.challengeMilestone.findFirst({
      where: { days, enabled: true },
    });
    const reward = fromDb?.coinReward ?? MILESTONE_REWARDS[days];
    if (reward == null) {
      throw new AppError('ECONOMY_MILESTONE_INVALID', 'Unknown milestone.', 400);
    }
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.streakDays < days) {
      throw new AppError(
        'ECONOMY_STREAK_REQUIRED',
        `Need ${days}-day streak first.`,
        409,
      );
    }
    const key = `earn:milestone:${userId}:${days}`;
    return this.applyEarn(userId, key, async () => ({
      delta: reward,
      reason: `earn:milestone:${days}`,
    }));
  }

  private async applyEarn(
    userId: string,
    idempotencyKey: string,
    build: (
      tx: Prisma.TransactionClient,
    ) => Promise<{ delta: number; reason: string }>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.walletLedger.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        return {
          coins: existing.balanceAfter,
          delta: existing.delta,
          alreadyApplied: true,
          reason: existing.reason,
        };
      }

      const { delta, reason } = await build(tx);
      const current = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      const nextCoins = Math.max(0, Math.min(9_999_999, current.coins + delta));
      await tx.user.update({
        where: { id: userId },
        data: { coins: nextCoins },
      });

      await tx.walletLedger.create({
        data: {
          userId,
          delta: nextCoins - current.coins,
          balanceAfter: nextCoins,
          reason,
          idempotencyKey,
        },
      });

      return {
        coins: nextCoins,
        delta: nextCoins - current.coins,
        alreadyApplied: false,
        reason,
      };
    });
  }

  private async requireUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new AppError('AUTH_SUSPENDED', 'This account is suspended.', 403);
    }
    return user;
  }

  private assertNotFrozen(user: { walletFrozen: boolean }) {
    if (user.walletFrozen) {
      throw new AppError(
        'WALLET_FROZEN',
        'This wallet is frozen by ops.',
        403,
      );
    }
  }
}
// --- End: Economy live wire (Sachin) ---
