import { Injectable } from '@nestjs/common';
import {
  Prisma,
  RedeemCodeStatus,
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
  rollScratchCoins,
  scratchWindowIndex,
} from './redeem-scratch-math';

@Injectable()
export class RedeemScratchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
  ) {}

  static readonly SAFE_TIP = REDEEM_SCRATCH_SAFE_TIP;

  async scratch(userId: string, redeemCodeId: string, attemptKeyRaw: string) {
    const attemptKey = assertScratchAttemptKey(attemptKeyRaw);
    await this.assertSeat(userId);

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
        this.assertScratchCardOpen(code, new Date());

        const pass = await tx.redeemScratchPass.findUnique({
          where: {
            userId_redeemCodeId: { userId, redeemCodeId },
          },
        });
        const allowed = pass?.allowedAttempts ?? 1;
        const used = await tx.redeemScratchRoll.count({
          where: { userId, redeemCodeId },
        });
        if (used >= allowed) {
          throw new AppError(
            'REDEEM_NEED_AD',
            'Watch an ad to scratch again and earn more coins.',
            409,
          );
        }

        const min = code.coinRewardMin ?? 5;
        const max = code.coinRewardMax ?? Math.max(min, 20);
        const coinsGranted = rollScratchCoins(min, max);

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

        let wonSecret: string | null = null;
        const startsAt = code.startsAt ?? code.createdAt;
        const wIdx = scratchWindowIndex(
          startsAt,
          code.windowMinutes,
          new Date(),
        );
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
              if (unused) {
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

        const roll = await tx.redeemScratchRoll.create({
          data: {
            userId,
            redeemCodeId,
            attemptKey,
            coinsGranted,
            codeSecret: wonSecret,
          },
        });

        return this.toScratchResult(roll, updatedUser.coins, false);
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

  async adUnlock(userId: string, redeemCodeId: string) {
    await this.assertSeat(userId);

    const code = await this.prisma.redeemCode.findUnique({
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
    this.assertScratchCardOpen(code, new Date());

    const used = await this.prisma.redeemScratchRoll.count({
      where: { userId, redeemCodeId },
    });
    const pass = await this.prisma.redeemScratchPass.findUnique({
      where: { userId_redeemCodeId: { userId, redeemCodeId } },
    });
    const allowed = pass?.allowedAttempts ?? 1;
    if (used < allowed) {
      return {
        ok: true,
        alreadyAllowed: true,
        allowedAttempts: allowed,
        usedAttempts: used,
        needsAd: false,
      };
    }

    const next = await this.prisma.redeemScratchPass.upsert({
      where: { userId_redeemCodeId: { userId, redeemCodeId } },
      create: {
        userId,
        redeemCodeId,
        allowedAttempts: used + 1,
      },
      update: { allowedAttempts: { increment: 1 } },
    });

    this.analytics.trackSafe({
      name: 'redeem_scratch_ad_unlock',
      userId,
      props: { redeem_id: redeemCodeId.slice(0, 40) },
    });

    return {
      ok: true,
      alreadyAllowed: false,
      allowedAttempts: next.allowedAttempts,
      usedAttempts: used,
      needsAd: false,
    };
  }

  async scratchMeta(userId: string, redeemCodeId: string) {
    const [used, pass] = await Promise.all([
      this.prisma.redeemScratchRoll.count({
        where: { userId, redeemCodeId },
      }),
      this.prisma.redeemScratchPass.findUnique({
        where: { userId_redeemCodeId: { userId, redeemCodeId } },
      }),
    ]);
    const allowed = pass?.allowedAttempts ?? 1;
    return {
      usedAttempts: used,
      allowedAttempts: allowed,
      needsAd: used >= allowed,
      canScratch: used < allowed,
    };
  }

  private assertScratchCardOpen(
    code: {
      status: RedeemCodeStatus;
      startsAt: Date | null;
      endsAt: Date | null;
      expiresAt: Date | null;
      createdAt: Date;
    },
    now: Date,
  ) {
    if (code.status === RedeemCodeStatus.PAUSED) {
      throw new AppError(
        'REDEEM_PAUSED',
        'This scratch card is paused right now.',
        409,
      );
    }
    if (
      code.status === RedeemCodeStatus.EXPIRED ||
      (code.expiresAt != null && code.expiresAt.getTime() <= now.getTime())
    ) {
      throw new AppError('REDEEM_EXPIRED', 'This scratch card has ended.', 409);
    }
    if (code.status !== RedeemCodeStatus.ACTIVE) {
      throw new AppError(
        'REDEEM_UNAVAILABLE',
        'This scratch card is not available.',
        409,
      );
    }
    const start = code.startsAt ?? code.createdAt;
    if (now.getTime() < start.getTime()) {
      throw new AppError(
        'REDEEM_NOT_STARTED',
        'This scratch card has not started yet.',
        409,
      );
    }
    if (code.endsAt != null && now.getTime() > code.endsAt.getTime()) {
      throw new AppError(
        'REDEEM_SCHEDULE_ENDED',
        'This scratch schedule has ended.',
        409,
      );
    }
  }

  private async assertSeat(userId: string) {
    const seat = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isActive: true, isRestricted: true },
    });
    if (!seat || !seat.isActive) {
      throw new AppError('AUTH_SUSPENDED', 'This account is suspended.', 403);
    }
    if (seat.isRestricted) {
      throw new AppError(
        'USER_RESTRICTED',
        'Redeem is paused while this account is restricted.',
        403,
      );
    }
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
