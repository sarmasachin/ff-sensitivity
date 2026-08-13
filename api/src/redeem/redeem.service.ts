import { Injectable } from '@nestjs/common';
import { Prisma, RedeemCodeStatus, RedeemMode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import { AnalyticsService } from '../analytics/analytics.service';
import { RedeemScratchService } from './redeem-scratch.service';
import { RedeemClaimsService } from './redeem-claims.service';
import { RedeemCatalogService } from './redeem-catalog.service';

// --- Start: Redeem live wire (Sachin) ---
@Injectable()
export class RedeemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
    private readonly scratchService: RedeemScratchService,
    private readonly claimsService: RedeemClaimsService,
    private readonly catalogService: RedeemCatalogService,
  ) {}

  catalog(userId: string) {
    return this.catalogService.catalog(userId);
  }

  async claim(userId: string, redeemCodeId: string) {
    this.assertRedeemId(redeemCodeId);

    const modeRow = await this.prisma.redeemCode.findUnique({
      where: { id: redeemCodeId },
      select: { mode: true },
    });
    if (!modeRow) {
      throw new AppError('REDEEM_NOT_FOUND', 'Code not found.', 404);
    }
    if (modeRow.mode === RedeemMode.SCRATCH_REWARD) {
      throw new AppError(
        'REDEEM_USE_SCRATCH',
        'Use scratch to earn coins on this card.',
        409,
      );
    }

    const seat = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isActive: true, isRestricted: true, coins: true },
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

    const existing = await this.prisma.redeemClaim.findUnique({
      where: {
        userId_redeemCodeId: { userId, redeemCodeId },
      },
    });
    if (existing) {
      return {
        id: redeemCodeId,
        code: existing.codeSecret,
        alreadyClaimed: true,
        coinCost: null as number | null,
        coinsRemaining: seat.coins,
      };
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const code = await tx.redeemCode.findUnique({
          where: { id: redeemCodeId },
        });
        if (!code) {
          throw new AppError('REDEEM_NOT_FOUND', 'Code not found.', 404);
        }
        if (code.status === RedeemCodeStatus.PAUSED) {
          throw new AppError(
            'REDEEM_PAUSED',
            'This code is paused right now.',
            409,
          );
        }

        const now = new Date();
        if (
          code.status === RedeemCodeStatus.EXPIRED ||
          (code.expiresAt != null && code.expiresAt.getTime() <= now.getTime())
        ) {
          if (code.status !== RedeemCodeStatus.EXPIRED) {
            await tx.redeemCode.update({
              where: { id: redeemCodeId },
              data: { status: RedeemCodeStatus.EXPIRED },
            });
          }
          throw new AppError(
            'REDEEM_EXPIRED',
            'This code has expired.',
            409,
          );
        }

        if (
          code.status === RedeemCodeStatus.EXHAUSTED ||
          code.stockLeft <= 0
        ) {
          throw new AppError(
            'OUT_OF_STOCK',
            'This code is no longer available.',
            409,
          );
        }
        if (code.status !== RedeemCodeStatus.ACTIVE) {
          throw new AppError(
            'REDEEM_UNAVAILABLE',
            'This code is not available.',
            409,
          );
        }

        // One secret per inventory row — shared multi-stock secrets are not allowed.
        if (code.stockLeft !== 1) {
          throw new AppError(
            'REDEEM_STOCK_INVALID',
            'This code inventory is misconfigured.',
            409,
          );
        }

        await this.assertCadenceWindow(tx, userId, code.cadence, now);

        // Re-check seat inside txn so concurrent restrict/suspend cannot race past.
        const live = await tx.user.findUnique({
          where: { id: userId },
          select: { isActive: true, isRestricted: true },
        });
        if (!live || !live.isActive) {
          throw new AppError(
            'AUTH_SUSPENDED',
            'This account is suspended.',
            403,
          );
        }
        if (live.isRestricted) {
          throw new AppError(
            'USER_RESTRICTED',
            'Redeem is paused while this account is restricted.',
            403,
          );
        }

        const cost = code.coinCost;
        if (cost != null && cost > 0) {
          const paid = await tx.user.updateMany({
            where: {
              id: userId,
              coins: { gte: cost },
              isActive: true,
              isRestricted: false,
            },
            data: { coins: { decrement: cost } },
          });
          if (paid.count !== 1) {
            throw new AppError(
              'NOT_ENOUGH_COINS',
              `You need ${cost} coins to unlock this reward.`,
              409,
            );
          }
          const afterPay = await tx.user.findUniqueOrThrow({
            where: { id: userId },
            select: { coins: true },
          });
          await tx.walletLedger.create({
            data: {
              userId,
              delta: -cost,
              balanceAfter: afterPay.coins,
              reason: `redeem:${redeemCodeId}`,
              idempotencyKey: `redeem:${userId}:${redeemCodeId}`,
            },
          });
        }

        const updated = await tx.redeemCode.updateMany({
          where: {
            id: redeemCodeId,
            status: RedeemCodeStatus.ACTIVE,
            stockLeft: 1,
          },
          data: {
            stockLeft: { decrement: 1 },
            status: RedeemCodeStatus.EXHAUSTED,
          },
        });
        if (updated.count !== 1) {
          throw new AppError(
            'OUT_OF_STOCK',
            'This code is no longer available.',
            409,
          );
        }

        const claim = await tx.redeemClaim.create({
          data: {
            userId,
            redeemCodeId,
            codeSecret: code.codeSecret,
          },
        });

        const user = await tx.user.findUniqueOrThrow({
          where: { id: userId },
          select: { coins: true },
        });

        return {
          id: redeemCodeId,
          code: claim.codeSecret,
          alreadyClaimed: false,
          coinCost: cost,
          coinsRemaining: user.coins,
        };
      });

      this.analytics.trackSafe({
        name: 'redeem_claim',
        userId,
        props: { redeem_id: redeemCodeId.slice(0, 40) },
      });
      return result;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const again = await this.prisma.redeemClaim.findUnique({
          where: {
            userId_redeemCodeId: { userId, redeemCodeId },
          },
        });
        if (again) {
          const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
            select: { coins: true },
          });
          return {
            id: redeemCodeId,
            code: again.codeSecret,
            alreadyClaimed: true,
            coinCost: null as number | null,
            coinsRemaining: user.coins,
          };
        }
      }
      throw err;
    }
  }

  scratch(userId: string, redeemCodeId: string, attemptKey: string) {
    this.assertRedeemId(redeemCodeId);
    return this.scratchService.scratch(userId, redeemCodeId, attemptKey);
  }

  scratchAdUnlock(userId: string, redeemCodeId: string) {
    this.assertRedeemId(redeemCodeId);
    return this.scratchService.adUnlock(userId, redeemCodeId);
  }

  myClaims(userId: string) {
    return this.claimsService.myClaims(userId);
  }

  private assertRedeemId(redeemCodeId: string) {
    const id = redeemCodeId?.trim() ?? '';
    if (id.length < 10 || id.length > 40 || !/^[a-z0-9_-]+$/i.test(id)) {
      throw new AppError('REDEEM_INVALID_ID', 'Invalid redeem code id.', 400);
    }
  }

  /** Cap claims per cadence window using live cadence defs. */
  private async assertCadenceWindow(
    tx: Prisma.TransactionClient,
    userId: string,
    cadence: string,
    now: Date,
  ) {
    const def = await tx.redeemCadenceDef.findUnique({ where: { id: cadence } });
    const windowHours =
      def?.windowHours ?? (cadence === 'WEEKLY' ? 168 : 24);
    const limit = def?.claimLimit ?? (cadence === 'WEEKLY' ? 2 : 3);
    const since = new Date(now.getTime() - windowHours * 60 * 60 * 1000);

    const recent = await tx.redeemClaim.count({
      where: {
        userId,
        createdAt: { gte: since },
        redeemCode: { cadence },
      },
    });
    if (recent >= limit) {
      const label = def?.label ?? cadence;
      throw new AppError(
        'REDEEM_CADENCE_LIMIT',
        `${label} redeem limit reached. Try again later.`,
        429,
      );
    }
  }
}
// --- End: Redeem live wire (Sachin) ---
