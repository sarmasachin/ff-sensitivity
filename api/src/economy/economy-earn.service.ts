import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import {
  BOOST_CHECKIN,
  BOOST_QUIZ,
  ECONOMY_AMOUNTS,
  MILESTONE_REWARDS,
  utcDateKey,
} from './economy-catalog';
import { loadEconomyRates, settleCoinDelta } from './economy-rates';
import { saveScratchArchive } from '../scratch/scratch-history';

@Injectable()
export class EconomyEarnService {
  constructor(private readonly prisma: PrismaService) {}

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
        throw new AppError(
          'ECONOMY_QUIZ_MOVED',
          'Submit quiz via /api/v1/challenge/quiz/submit.',
          400,
        );
      case 'AD':
        return this.earnAd(userId);
      case 'MILESTONE':
        return this.earnMilestone(userId, opts.milestoneDays);
      default:
        throw new AppError('ECONOMY_INVALID', 'Unknown earn kind.', 400);
    }
  }

  async earnQuizGraded(
    userId: string,
    correct: boolean,
    amounts: { correctCoins: number; wrongCoins: number },
  ) {
    const user = await this.requireUser(userId);
    this.assertNotFrozen(user);
    const rates = await loadEconomyRates(this.prisma);
    if (!rates.quizEnabled) {
      throw new AppError('ECONOMY_QUIZ_DISABLED', 'Quiz rewards are turned off.', 403);
    }
    return this.earnQuiz(userId, utcDateKey(), correct, amounts);
  }

  async earnScratchCoins(userId: string, day: string, slot: number, amount: number) {
    const user = await this.requireUser(userId);
    this.assertNotFrozen(user);
    const safe = Math.max(0, Math.min(100_000, Math.floor(amount)));
    const key = `earn:scratch:${userId}:${day}:${slot}`;
    return this.applyEarn(userId, key, async () => ({
      delta: safe,
      reason: 'earn:scratch',
    }));
  }

  private async earnCheckin(userId: string, day: string) {
    const rates = await loadEconomyRates(this.prisma);
    if (!rates.checkInEnabled) {
      throw new AppError('ECONOMY_CHECKIN_DISABLED', 'Check-in is turned off.', 403);
    }
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

      let delta = rates.checkinCoins;
      let usedBoost = false;
      const boost = await tx.userBoostCharge.findUnique({
        where: { userId_boostId: { userId, boostId: BOOST_CHECKIN } },
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
          where: { userId_boostId: { userId, boostId: BOOST_QUIZ } },
        });
        if (boost && boost.charges > 0) {
          delta = correctCoins * 2;
          usedBoost = true;
          await tx.userBoostCharge.update({
            where: { id: boost.id },
            data: { charges: { decrement: 1 } },
          });
        }
        return { delta, reason: usedBoost ? 'earn:quiz:ok:boost' : 'earn:quiz:ok' };
      });
    }

    const wrongCount = await this.prisma.walletLedger.count({
      where: {
        userId,
        reason: 'earn:quiz:wrong',
        idempotencyKey: { startsWith: `earn:quiz:wrong:${userId}:${day}:` },
      },
    });
    if (wrongCount >= 2) {
      throw new AppError('ECONOMY_QUIZ_CLOSED', 'Quiz closed for today.', 409);
    }
    const key = `earn:quiz:wrong:${userId}:${day}:${wrongCount + 1}`;
    return this.applyEarn(userId, key, async () => ({
      delta: wrongCoins,
      reason: 'earn:quiz:wrong',
    }));
  }

  private async earnAd(userId: string) {
    const rates = await loadEconomyRates(this.prisma);
    if (!rates.adBonusEnabled) {
      throw new AppError('ECONOMY_AD_DISABLED', 'Ad bonus is disabled.', 403);
    }
    const cooldownMs = rates.adBonusCooldownHours * 60 * 60 * 1000;
    const coins = rates.adBonusCoins;
    const idempotencyKey = `earn:ad:${userId}:${randomUUID()}`;

    return this.prisma.$transaction(async (tx) => {
      const last = await tx.walletLedger.findFirst({
        where: { userId, reason: 'earn:ad' },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });
      if (last) {
        const nextAt = last.createdAt.getTime() + cooldownMs;
        if (Date.now() < nextAt) {
          throw new AppError(
            'ECONOMY_AD_COOLDOWN',
            'Ad bonus is on cooldown. Try again later.',
            409,
            { nextAdAvailableAtMs: nextAt },
          );
        }
      }

      const existing = await tx.walletLedger.findUnique({ where: { idempotencyKey } });
      if (existing) {
        return {
          coins: existing.balanceAfter,
          delta: existing.delta,
          alreadyApplied: true,
          reason: existing.reason,
          nextAdAvailableAtMs: existing.createdAt.getTime() + cooldownMs,
        };
      }

      const current = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      if (current.walletFrozen) {
        throw new AppError('WALLET_FROZEN', 'Wallet is frozen.', 403);
      }
      const settled = await settleCoinDelta(tx, userId, current.coins, coins);
      await tx.user.update({
        where: { id: userId },
        data: { coins: settled.nextCoins },
      });
      const row = await tx.walletLedger.create({
        data: {
          userId,
          delta: settled.applied,
          balanceAfter: settled.nextCoins,
          reason: 'earn:ad',
          idempotencyKey,
        },
      });
      return {
        coins: settled.nextCoins,
        delta: settled.applied,
        alreadyApplied: false,
        reason: 'earn:ad',
        nextAdAvailableAtMs: row.createdAt.getTime() + cooldownMs,
      };
    });
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
      throw new AppError('ECONOMY_STREAK_REQUIRED', `Need ${days}-day streak first.`, 409);
    }
    const key = `earn:milestone:${userId}:${days}`;
    const earned = await this.applyEarn(userId, key, async () => ({
      delta: reward,
      reason: `earn:milestone:${days}`,
    }));
    const title = fromDb?.title?.trim() || `Day ${days}`;
    await saveScratchArchive(this.prisma, {
      userId,
      sourceKey: `milestone:${days}`,
      kind: 'MILESTONE',
      title: `Day ${days} · ${title}`,
      detail: 'Daily Challenge streak reward',
      rewardLabel: fromDb?.rewardLabel?.trim() || `+${reward} coins`,
      coins: reward,
      badge: fromDb?.badge ?? null,
    });
    return earned;
  }

  private async applyEarn(
    userId: string,
    idempotencyKey: string,
    build: (
      tx: Prisma.TransactionClient,
    ) => Promise<{ delta: number; reason: string }>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.walletLedger.findUnique({ where: { idempotencyKey } });
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
      const settled = await settleCoinDelta(tx, userId, current.coins, delta);
      await tx.user.update({
        where: { id: userId },
        data: { coins: settled.nextCoins },
      });
      await tx.walletLedger.create({
        data: {
          userId,
          delta: settled.applied,
          balanceAfter: settled.nextCoins,
          reason,
          idempotencyKey,
        },
      });
      return {
        coins: settled.nextCoins,
        delta: settled.applied,
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
      throw new AppError('WALLET_FROZEN', 'This wallet is frozen by ops.', 403);
    }
  }
}
