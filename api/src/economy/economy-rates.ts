import { Prisma } from '@prisma/client';
import { AppError } from '../common/errors/app-error';
import { CONFIG_ID } from '../challenge/challenge-shared';

type RateDb = {
  challengeConfig: {
    findUnique: Prisma.TransactionClient['challengeConfig']['findUnique'];
  };
  walletLedger: Prisma.TransactionClient['walletLedger'];
};

export type EconomyRates = {
  checkinCoins: number;
  checkinBoostExtra: number;
  quizCorrectCoins: number;
  quizWrongCoins: number;
  adBonusCoins: number;
  walletCap: number;
  dailyEarnCap: number;
  checkInEnabled: boolean;
  quizEnabled: boolean;
  adBonusEnabled: boolean;
  adBonusCooldownHours: number;
};

function clampCap(n: number): number {
  if (!Number.isFinite(n)) return 9_999_999;
  return Math.max(100, Math.min(9_999_999, Math.floor(n)));
}

export async function loadEconomyRates(db: RateDb): Promise<EconomyRates> {
  const row = await db.challengeConfig.findUnique({ where: { id: CONFIG_ID } });
  return {
    checkinCoins: row?.checkinCoins ?? 20,
    checkinBoostExtra: 20,
    quizCorrectCoins: row?.quizCorrectCoins ?? 50,
    quizWrongCoins: row?.quizWrongCoins ?? -10,
    adBonusCoins: Math.max(0, row?.adBonusCoins ?? 30),
    walletCap: clampCap(row?.walletCap ?? 9_999_999),
    dailyEarnCap: Math.max(0, row?.dailyEarnCap ?? 0),
    checkInEnabled: row?.checkInEnabled ?? true,
    quizEnabled: row?.quizEnabled ?? true,
    adBonusEnabled: row?.adBonusOptional ?? true,
    adBonusCooldownHours: Math.max(1, row?.adBonusCooldownHours ?? 4),
  };
}

function utcDayStart(now = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/** Apply a coin delta using the saved wallet cap and daily earn cap. */
export async function settleCoinDelta(
  tx: Prisma.TransactionClient,
  userId: string,
  current: number,
  delta: number,
): Promise<{ nextCoins: number; applied: number }> {
  const rates = await loadEconomyRates(tx);
  let nextDelta = delta;
  if (nextDelta > 0 && rates.dailyEarnCap > 0) {
    const earned = await tx.walletLedger.aggregate({
      where: {
        userId,
        delta: { gt: 0 },
        reason: { startsWith: 'earn:' },
        createdAt: { gte: utcDayStart() },
      },
      _sum: { delta: true },
    });
    const room = rates.dailyEarnCap - (earned._sum.delta ?? 0);
    if (room <= 0) {
      throw new AppError('ECONOMY_DAILY_CAP', 'Daily earn cap reached.', 409);
    }
    nextDelta = Math.min(nextDelta, room);
  }
  let nextCoins = current + nextDelta;
  if (nextDelta > 0) {
    nextCoins =
      current >= rates.walletCap ? current : Math.min(rates.walletCap, nextCoins);
  } else {
    nextCoins = Math.max(0, nextCoins);
  }
  return { nextCoins, applied: nextCoins - current };
}
