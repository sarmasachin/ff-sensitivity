import { Injectable } from '@nestjs/common';
import { RedeemMode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { AppError } from '../common/errors/app-error';
import { scratchWindowRange, isScratchCooldownActive } from './redeem-scratch-math';
import { assertRedeemSeat, assertScratchCardOpen } from './redeem-scratch-guards';

@Injectable()
export class RedeemScratchPassService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
  ) {}

  async adUnlock(userId: string, redeemCodeId: string) {
    await assertRedeemSeat(this.prisma, userId);
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
    const last = await this.prisma.redeemScratchRoll.findFirst({
      where: { userId, redeemCodeId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    const locked =
      !!last &&
      isScratchCooldownActive(last.createdAt, code.windowMinutes, now);
    const totalUsed = await this.prisma.redeemScratchRoll.count({
      where: { userId, redeemCodeId },
    });
    const pass = await this.prisma.redeemScratchPass.findUnique({
      where: { userId_redeemCodeId: { userId, redeemCodeId } },
    });
    const allowed = pass?.allowedAttempts ?? 1;
    if (locked) {
      return {
        ok: true,
        alreadyAllowed: true,
        allowedAttempts: allowed,
        usedAttempts: totalUsed,
        needsAd: false,
      };
    }
    if (totalUsed < allowed) {
      return {
        ok: true,
        alreadyAllowed: true,
        allowedAttempts: allowed,
        usedAttempts: totalUsed,
        needsAd: false,
      };
    }
    const next = await this.prisma.redeemScratchPass.upsert({
      where: { userId_redeemCodeId: { userId, redeemCodeId } },
      create: {
        userId,
        redeemCodeId,
        allowedAttempts: totalUsed + 1,
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
      usedAttempts: totalUsed,
      needsAd: false,
    };
  }

  async scratchMeta(userId: string, redeemCodeId: string) {
    const empty = {
      usedAttempts: 0,
      allowedAttempts: 1,
      needsAd: false,
      canScratch: false,
      waitUntil: null as string | null,
      waitNext: null as 'AD' | 'SCRATCH' | null,
    };
    const code = await this.prisma.redeemCode.findUnique({
      where: { id: redeemCodeId },
    });
    if (!code || code.mode !== RedeemMode.SCRATCH_REWARD) return empty;
    const now = new Date();
    const window = scratchWindowRange(
      code.startsAt ?? code.createdAt,
      code.windowMinutes,
      now,
    );
    if (!window) {
      const start = code.startsAt;
      if (start && start.getTime() > now.getTime()) {
        return {
          ...empty,
          waitUntil: start.toISOString(),
          waitNext: 'SCRATCH',
        };
      }
      return empty;
    }
    const last = await this.prisma.redeemScratchRoll.findFirst({
      where: { userId, redeemCodeId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    const locked =
      !!last &&
      isScratchCooldownActive(last.createdAt, code.windowMinutes, now);
    const totalUsed = await this.prisma.redeemScratchRoll.count({
      where: { userId, redeemCodeId },
    });
    const pass = await this.prisma.redeemScratchPass.findUnique({
      where: { userId_redeemCodeId: { userId, redeemCodeId } },
    });
    const allowed = pass?.allowedAttempts ?? 1;
    if (locked && last) {
      const waitMs = Math.max(1, code.windowMinutes) * 60_000;
      return {
        usedAttempts: totalUsed,
        allowedAttempts: allowed,
        needsAd: false,
        canScratch: false,
        waitUntil: new Date(last.createdAt.getTime() + waitMs).toISOString(),
        waitNext: totalUsed >= allowed ? 'AD' : 'SCRATCH',
      };
    }
    const needsAd = totalUsed >= allowed;
    return {
      usedAttempts: totalUsed,
      allowedAttempts: allowed,
      needsAd,
      canScratch: !needsAd,
      waitUntil: null,
      waitNext: null,
    };
  }
}
