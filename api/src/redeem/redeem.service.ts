import { Injectable } from '@nestjs/common';
import { Prisma, RedeemCadence, RedeemCodeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import { SettingsService } from '../settings/settings.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { maskRedeemCode } from './redeem-mask';

// --- Start: Redeem live wire (Sachin) ---
@Injectable()
export class RedeemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly analytics: AnalyticsService,
  ) {}

  async catalog(userId: string) {
    const now = new Date();
    const codes = await this.prisma.redeemCode.findMany({
      where: {
        status: {
          in: [
            RedeemCodeStatus.ACTIVE,
            RedeemCodeStatus.EXHAUSTED,
            RedeemCodeStatus.EXPIRED,
            RedeemCodeStatus.PAUSED,
          ],
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const claims = await this.prisma.redeemClaim.findMany({
      where: { userId },
      select: { redeemCodeId: true, codeSecret: true },
    });
    const claimMap = new Map(
      claims.map((c) => [c.redeemCodeId, c.codeSecret] as const),
    );

    return {
      items: codes.map((row) => {
        const mine = claimMap.get(row.id);
        const claimedByMe = Boolean(mine);
        const expiredByTime =
          row.expiresAt != null && row.expiresAt.getTime() <= now.getTime();
        const listStatus =
          expiredByTime || row.status === RedeemCodeStatus.EXPIRED
            ? 'CLAIMED'
            : row.status === RedeemCodeStatus.ACTIVE && row.stockLeft > 0
              ? claimedByMe
                ? 'CLAIMED'
                : 'ACTIVE'
              : row.status === RedeemCodeStatus.EXHAUSTED || row.stockLeft <= 0
                ? 'CLAIMED'
                : row.status === RedeemCodeStatus.ACTIVE
                  ? 'ACTIVE'
                  : 'CLAIMED';

        return {
          id: row.id,
          type: row.type,
          title: row.title,
          valueLabel: row.valueLabel,
          codeMasked: maskRedeemCode(row.codeSecret),
          code: claimedByMe ? mine : null,
          status: listStatus,
          expiresLabel: row.expiresLabel,
          tip: row.tip,
          redeemUrl: row.redeemUrl,
          stockLeft: row.stockLeft,
          coinCost: row.coinCost,
          cadence: row.cadence,
          unlocked: claimedByMe,
        };
      }),
    };
  }

  async claim(userId: string, redeemCodeId: string) {
    this.assertRedeemId(redeemCodeId);

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

  private assertRedeemId(redeemCodeId: string) {
    const id = redeemCodeId?.trim() ?? '';
    if (id.length < 10 || id.length > 40 || !/^[a-z0-9_-]+$/i.test(id)) {
      throw new AppError('REDEEM_INVALID_ID', 'Invalid redeem code id.', 400);
    }
  }

  /** Cap claims per cadence window so daily/weekly tabs stay fair. */
  private async assertCadenceWindow(
    tx: Prisma.TransactionClient,
    userId: string,
    cadence: RedeemCadence,
    now: Date,
  ) {
    const since =
      cadence === RedeemCadence.WEEKLY
        ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const limit = cadence === RedeemCadence.WEEKLY ? 2 : 3;

    const recent = await tx.redeemClaim.count({
      where: {
        userId,
        createdAt: { gte: since },
        redeemCode: { cadence },
      },
    });
    if (recent >= limit) {
      throw new AppError(
        'REDEEM_CADENCE_LIMIT',
        cadence === RedeemCadence.WEEKLY
          ? 'Weekly redeem limit reached. Try again later.'
          : 'Daily redeem limit reached. Try again tomorrow.',
        429,
      );
    }
  }

  // --- Start: Claims live wire (Sachin) ---
  async myClaims(userId: string) {
    const rows = await this.prisma.redeemClaim.findMany({
      where: { userId },
      include: {
        redeemCode: {
          select: {
            id: true,
            title: true,
            valueLabel: true,
            type: true,
            redeemUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((r) => ({
      id: r.id,
      redeemCodeId: r.redeemCodeId,
      title: r.redeemCode.title,
      valueLabel: r.redeemCode.valueLabel,
      type: r.redeemCode.type,
      redeemUrl: r.redeemCode.redeemUrl,
      codeMasked: maskRedeemCode(r.codeSecret),
      code: r.codeSecret,
      flagged: r.flagged,
      createdAt: r.createdAt.toISOString(),
      whenLabel: relativeLabel(r.createdAt),
    }));
  }

  async adminListClaims(query?: string) {
    const q = query?.trim();
    const where: Prisma.RedeemClaimWhereInput = q
      ? {
          OR: [
            { redeemCode: { title: { contains: q, mode: 'insensitive' } } },
            { user: { email: { contains: q, mode: 'insensitive' } } },
            { user: { displayName: { contains: q, mode: 'insensitive' } } },
            { redeemCodeId: { contains: q } },
            { id: { contains: q } },
          ],
        }
      : {};

    const rows = await this.prisma.redeemClaim.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, displayName: true } },
        redeemCode: {
          select: { id: true, title: true, stockLeft: true, valueLabel: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });

    const userIds = [...new Set(rows.map((r) => r.userId))];
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCounts = await this.prisma.redeemClaim.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds }, createdAt: { gte: dayAgo } },
      _count: { _all: true },
    });
    const recentMap = new Map(
      recentCounts.map((c) => [c.userId, c._count._all] as const),
    );

    return rows.map((r) => this.toAdminClaimRow(r, recentMap.get(r.userId) ?? 1));
  }

  async adminClaimsStats() {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [copied, flagged, distinctUsers, recentByUser] = await Promise.all([
      this.prisma.redeemClaim.count({ where: { flagged: false } }),
      this.prisma.redeemClaim.count({ where: { flagged: true } }),
      this.prisma.redeemClaim
        .findMany({ select: { userId: true }, distinct: ['userId'] })
        .then((r) => r.length),
      this.prisma.redeemClaim.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: dayAgo } },
        _count: { _all: true },
      }),
    ]);
    const highAbuse = recentByUser.filter((u) => u._count._all >= 4).length;
    return {
      copied,
      blocked: 0,
      flagged: flagged + highAbuse,
      devices: distinctUsers,
    };
  }

  async adminFlagClaim(
    adminId: string,
    claimId: string,
    flagged: boolean,
    note?: string,
  ) {
    this.assertClaimId(claimId);
    const before = await this.prisma.redeemClaim.findUnique({
      where: { id: claimId },
    });
    if (!before) {
      throw new AppError('CLAIM_NOT_FOUND', 'Claim not found.', 404);
    }
    const after = await this.prisma.redeemClaim.update({
      where: { id: claimId },
      data: {
        flagged,
        adminNote: note?.trim()
          ? note.trim().slice(0, 280)
          : flagged
            ? 'Manually flagged by staff.'
            : 'Cleared by staff after review.',
      },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
        redeemCode: {
          select: { id: true, title: true, stockLeft: true, valueLabel: true },
        },
      },
    });
    await this.prisma.auditLog.create({
      data: {
        actorAdminId: adminId,
        action: flagged ? 'claims.flag' : 'claims.clear',
        entity: `redeem_claim:${claimId}`,
        beforeJson: { flagged: before.flagged },
        afterJson: { flagged: after.flagged },
      },
    });
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await this.prisma.redeemClaim.count({
      where: { userId: after.userId, createdAt: { gte: dayAgo } },
    });
    return this.toAdminClaimRow(after, Math.max(1, recent));
  }

  async adminDeleteClaim(adminId: string, claimId: string) {
    this.assertClaimId(claimId);
    const before = await this.prisma.redeemClaim.findUnique({
      where: { id: claimId },
      include: {
        redeemCode: { select: { title: true } },
        user: { select: { email: true } },
      },
    });
    if (!before) {
      throw new AppError('CLAIM_NOT_FOUND', 'Claim not found.', 404);
    }
    // Do NOT restore stock — prevents re-claim abuse after staff delete.
    await this.prisma.redeemClaim.delete({ where: { id: claimId } });
    await this.prisma.auditLog.create({
      data: {
        actorAdminId: adminId,
        action: 'claims.delete',
        entity: `redeem_claim:${claimId}`,
        beforeJson: {
          userEmail: before.user.email,
          title: before.redeemCode.title,
          redeemCodeId: before.redeemCodeId,
        },
        afterJson: { deleted: true, stockRestored: false },
      },
    });
    return { ok: true };
  }

  async adminRevealClaim(
    adminId: string,
    claimId: string,
    currentPassword?: string,
  ) {
    this.assertClaimId(claimId);
    await this.settings.assertStepUp(adminId, currentPassword, 'reveal');
    const row = await this.prisma.redeemClaim.findUnique({
      where: { id: claimId },
      include: {
        redeemCode: { select: { title: true } },
        user: { select: { email: true } },
      },
    });
    if (!row) {
      throw new AppError('CLAIM_NOT_FOUND', 'Claim not found.', 404);
    }
    await this.prisma.auditLog.create({
      data: {
        actorAdminId: adminId,
        action: 'claims.reveal',
        entity: `redeem_claim:${claimId}`,
        afterJson: {
          title: row.redeemCode.title,
          userEmail: row.user.email,
        },
      },
    });
    return {
      id: row.id,
      codeMasked: maskRedeemCode(row.codeSecret),
      code: row.codeSecret,
      title: row.redeemCode.title,
    };
  }

  private toAdminClaimRow(
    r: {
      id: string;
      userId: string;
      redeemCodeId: string;
      codeSecret: string;
      flagged: boolean;
      adminNote: string | null;
      createdAt: Date;
      user: { id: string; email: string; displayName: string | null };
      redeemCode: { id: string; title: string; stockLeft: number; valueLabel: string };
    },
    recent: number,
  ) {
    const abuseScore = r.flagged
      ? Math.max(75, Math.min(99, 50 + recent * 15))
      : Math.min(70, recent * 12);
    return {
      id: r.id,
      title: r.redeemCode.title,
      refId: r.redeemCodeId,
      codeMasked: maskRedeemCode(r.codeSecret),
      deviceId: r.user.email,
      userId: r.user.id,
      userDisplayName: r.user.displayName,
      result: r.flagged ? ('FLAGGED' as const) : ('SUCCESS' as const),
      whenLabel: relativeLabel(r.createdAt),
      createdAt: r.createdAt.toISOString(),
      stockAfter: r.redeemCode.stockLeft,
      abuseScore,
      note:
        r.adminNote?.trim() ||
        (r.flagged
          ? 'Flagged by staff for review.'
          : 'Claimed on unlock (scratch). Stock consumed at claim.'),
    };
  }

  private assertClaimId(claimId: string) {
    const id = claimId?.trim() ?? '';
    if (id.length < 10 || id.length > 40 || id.includes('/') || !/^[a-z0-9_-]+$/i.test(id)) {
      throw new AppError('CLAIM_BAD_ID', 'Invalid claim id.', 400);
    }
  }
  // --- End: Claims live wire (Sachin) ---
}

function relativeLabel(date: Date): string {
  const ms = Date.now() - date.getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
}
// --- End: Redeem live wire (Sachin) ---
