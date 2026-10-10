import { Injectable } from '@nestjs/common';
import {
  Prisma,
  RedeemMode,
  RedeemSecretStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import { AnalyticsService } from '../analytics/analytics.service';
import { maskRedeemCode } from './redeem-mask';
import {
  REDEEM_SCRATCH_SAFE_TIP,
  assertScratchAttemptKey,
  isScratchCooldownActive,
  rollScratchCoins,
  scratchWindowRange,
  shouldAwardScratchCode,
} from './redeem-scratch-math';
import { assertRedeemSeat, assertScratchCardOpen } from './redeem-scratch-guards';
import { RedeemScratchPassService } from './redeem-scratch-pass.service';

@Injectable()
export class RedeemScratchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
    private readonly pass: RedeemScratchPassService,
  ) {}

  static readonly SAFE_TIP = REDEEM_SCRATCH_SAFE_TIP;

  async scratch(userId: string, redeemCodeId: string, attemptKeyRaw: string) {
    const attemptKey = assertScratchAttemptKey(attemptKeyRaw);
    await assertRedeemSeat(this.prisma, userId);

    const prior = await this.prisma.redeemScratchRoll.findUnique({
      where: {
        userId_redeemCodeId_attemptKey: {
          userId,
          redeemCodeId,
          attemptKey,
        },
      },
    });
    if (prior) {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { coins: true },
      });
      return this.toScratchResult(prior, user.coins, true);
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const code = await tx.redeemCode.findUnique({
          where: { id: redeemCodeId },
        });
        if (!code) {
          throw new AppError('REDEEM_NOT_FOUND', 'Card not found.', 404);
        }
        if (code.mode !== RedeemMode.SCRATCH_REWARD) {
          throw new AppError(
            'REDEEM_WRONG_MODE',
            'This card is not a scratch-reward card.',
            409,
          );
        }
        const now = new Date();
        assertScratchCardOpen(code, now);
        const window = scratchWindowRange(
          code.startsAt ?? code.createdAt,
          code.windowMinutes,
          now,
        );
        if (!window) {
          throw new AppError(
            'REDEEM_NOT_STARTED',
            'This scratch card has not started yet.',
            409,
          );
        }
        const last = await tx.redeemScratchRoll.findFirst({
          where: { userId, redeemCodeId },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        });
        if (
          last &&
          isScratchCooldownActive(last.createdAt, code.windowMinutes, now)
        ) {
          throw new AppError(
            'REDEEM_WINDOW_DONE',
            'Already scratched this round. Wait for the next window.',
            409,
          );
        }
        const totalUsed = await tx.redeemScratchRoll.count({
          where: { userId, redeemCodeId },
        });
        const pass = await tx.redeemScratchPass.findUnique({
          where: { userId_redeemCodeId: { userId, redeemCodeId } },
        });
        const allowed = pass?.allowedAttempts ?? 1;
        if (totalUsed >= allowed) {
          throw new AppError(
            'REDEEM_NEED_AD',
            'Watch an ad to scratch again and earn more coins.',
            409,
          );
        }

        let wonSecret: string | null = null;
        const wIdx = window.index;
        if (wIdx >= 0) {
          const alreadyWon = await tx.redeemScratchRoll.findFirst({
            where: {
              userId,
              redeemCodeId,
              codeSecret: { not: null },
            },
            select: { id: true },
          });
          if (!alreadyWon) {
            const awardedInWindow = await tx.redeemCodeSecret.count({
              where: {
                redeemCodeId,
                status: RedeemSecretStatus.ASSIGNED,
                awardWindow: wIdx,
              },
            });
            if (awardedInWindow < Math.max(1, code.codesPerWindow)) {
              const unused = await tx.redeemCodeSecret.findFirst({
                where: {
                  redeemCodeId,
                  status: RedeemSecretStatus.UNUSED,
                },
                orderBy: { createdAt: 'asc' },
              });
              const scratchesInWindow = await tx.redeemScratchRoll.count({
                where: {
                  redeemCodeId,
                  createdAt: { gte: window.start, lt: window.end },
                },
              });
              const remainingSlots =
                Math.max(1, code.codesPerWindow) - awardedInWindow;
              const remainingMs = window.end.getTime() - now.getTime();
              if (
                unused &&
                shouldAwardScratchCode({
                  remainingSlots,
                  scratchesInWindow,
                  remainingMs,
                })
              ) {
                const took = await tx.redeemCodeSecret.updateMany({
                  where: {
                    id: unused.id,
                    status: RedeemSecretStatus.UNUSED,
                  },
                  data: {
                    status: RedeemSecretStatus.ASSIGNED,
                    assignedUserId: userId,
                    assignedAt: new Date(),
                    awardWindow: wIdx,
                  },
                });
                if (took.count === 1) {
                  wonSecret = unused.codeSecret;
                  const left = await tx.redeemCodeSecret.count({
                    where: {
                      redeemCodeId,
                      status: RedeemSecretStatus.UNUSED,
                    },
                  });
                  await tx.redeemCode.update({
                    where: { id: redeemCodeId },
                    data: { stockLeft: left },
                  });
                  await tx.redeemClaim.upsert({
                    where: {
                      userId_redeemCodeId: { userId, redeemCodeId },
                    },
                    create: {
                      userId,
                      redeemCodeId,
                      codeSecret: wonSecret,
                    },
                    update: { codeSecret: wonSecret },
                  });
                }
              }
            }
          }
        }

        const min = code.coinRewardMin ?? 5;
        const max = code.coinRewardMax ?? Math.max(min, 20);
        const coinsGranted = wonSecret ? 0 : rollScratchCoins(min, max);
        let coinsRemaining: number;
        if (coinsGranted > 0) {
          const updatedUser = await tx.user.update({
            where: { id: userId },
            data: { coins: { increment: coinsGranted } },
            select: { coins: true },
          });
          await tx.walletLedger.create({
            data: {
              userId,
              delta: coinsGranted,
              balanceAfter: updatedUser.coins,
              reason: 'earn:redeem_scratch',
              idempotencyKey: `earn:redeem_scratch:${userId}:${redeemCodeId}:${attemptKey}`,
            },
          });
          coinsRemaining = updatedUser.coins;
        } else {
          const held = await tx.user.findUniqueOrThrow({
            where: { id: userId },
            select: { coins: true },
          });
          coinsRemaining = held.coins;
        }

        const roll = await tx.redeemScratchRoll.create({
          data: {
            userId,
            redeemCodeId,
            attemptKey,
            coinsGranted,
            codeSecret: wonSecret,
          },
        });

        return this.toScratchResult(roll, coinsRemaining, false);
      });

      this.analytics.trackSafe({
        name: 'redeem_scratch',
        userId,
        props: {
          redeem_id: redeemCodeId.slice(0, 40),
          coins: result.coinsGranted,
          got_code: Boolean(result.code),
        },
      });
      return result;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const again = await this.prisma.redeemScratchRoll.findUnique({
          where: {
            userId_redeemCodeId_attemptKey: {
              userId,
              redeemCodeId,
              attemptKey,
            },
          },
        });
        if (again) {
          const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
            select: { coins: true },
          });
          return this.toScratchResult(again, user.coins, true);
        }
      }
      throw err;
    }
  }

  adUnlock(userId: string, redeemCodeId: string) {
    return this.pass.adUnlock(userId, redeemCodeId);
  }

  scratchMeta(userId: string, redeemCodeId: string) {
    return this.pass.scratchMeta(userId, redeemCodeId);
  }

  private toScratchResult(
    roll: {
      redeemCodeId: string;
      coinsGranted: number;
      codeSecret: string | null;
      attemptKey: string;
    },
    coinsRemaining: number,
    alreadyProcessed: boolean,
  ) {
    return {
      id: roll.redeemCodeId,
      mode: RedeemMode.SCRATCH_REWARD,
      coinsGranted: roll.coinsGranted,
      code: roll.codeSecret,
      codeMasked: roll.codeSecret ? maskRedeemCode(roll.codeSecret) : null,
      alreadyProcessed,
      coinsRemaining,
      attemptKey: roll.attemptKey,
      tip: REDEEM_SCRATCH_SAFE_TIP,
    };
  }
}
