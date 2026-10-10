import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import { ShopAdminService } from '../shop/shop-admin.service';
import { EconomyEarnService } from './economy-earn.service';

// --- Start: Economy live wire (Sachin) ---
@Injectable()
export class EconomyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shop: ShopAdminService,
    private readonly earn: EconomyEarnService,
  ) {}

  async getWallet(userId: string) {
    const user = await this.requireUser(userId);
    const boosts = await this.prisma.userBoostCharge.findMany({
      where: { userId, charges: { gt: 0 } },
    });
    const shopRows = await this.prisma.walletLedger.findMany({
      where: { userId, reason: { startsWith: 'shop:' } },
      select: { reason: true },
    });
    const shopBuyCounts: Record<string, number> = {};
    for (const row of shopRows) {
      const id = row.reason.slice('shop:'.length);
      if (!id) continue;
      shopBuyCounts[id] = (shopBuyCounts[id] ?? 0) + 1;
    }
    const catalog = await this.shop.listPurchaseCatalog();
    const ownedShopIds = catalog
      .filter((item) => item.oneTime && (shopBuyCounts[item.id] ?? 0) > 0)
      .map((item) => item.id);
    return {
      coins: user.coins,
      frozen: user.walletFrozen,
      boosts: Object.fromEntries(boosts.map((b) => [b.boostId, b.charges])),
      ownedShopIds,
      shopBuyCounts,
    };
  }

  async shopCatalog() {
    return this.shop.appCatalog();
  }

  async earnChallenge(
    userId: string,
    kind: 'CHECKIN' | 'QUIZ' | 'AD' | 'MILESTONE',
    opts: { correct?: boolean; milestoneDays?: number },
  ) {
    return this.earn.earnChallenge(userId, kind, opts);
  }

  async purchaseShop(userId: string, itemId: string, requestId: string) {
    const user = await this.requireUser(userId);
    this.assertNotFrozen(user);
    const item = await this.shop.findPurchaseItem(itemId);
    if (!item || !item.enabled) {
      throw new AppError('SHOP_ITEM_NOT_FOUND', 'Item not found.', 404);
    }
    const safeReq = requestId.trim();
    if (safeReq.length < 8 || safeReq.length > 80) {
      throw new AppError('SHOP_BAD_REQUEST', 'Invalid request id.', 400);
    }

    const buyKeyBase = `shop:${userId}:${item.id}`;
    if (item.oneTime) {
      const prior = await this.prisma.walletLedger.findFirst({
        where: { userId, reason: `shop:${item.id}` },
      });
      if (prior) {
        throw new AppError('SHOP_ALREADY_OWNED', 'Already owned.', 409);
      }
    }

    const idempotencyKey = item.oneTime
      ? `${buyKeyBase}:once`
      : `${buyKeyBase}:req:${safeReq}`;

    return this.prisma.$transaction(async (tx) => {
      // Serialize buyers of this item so two users cannot take the last unit.
      await tx.$queryRaw`SELECT id FROM shop_items WHERE id = ${item.id} FOR UPDATE`;
      const existing = await tx.walletLedger.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        return {
          coins: existing.balanceAfter,
          itemId: item.id,
          alreadyApplied: true,
        };
      }

      if (item.stockLimit != null) {
        const buys = await this.shop.countItemSales(item.id, tx);
        if (buys >= item.stockLimit) {
          throw new AppError('SHOP_OUT_OF_STOCK', 'Out of stock.', 409);
        }
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

      const paidUser = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      await tx.walletLedger.create({
        data: {
          userId,
          delta: -item.priceCoins,
          balanceAfter: paidUser.coins,
          reason: `shop:${item.id}`,
          idempotencyKey,
        },
      });

      if (item.isBoost) {
        await tx.userBoostCharge.upsert({
          where: {
            userId_boostId: { userId, boostId: item.id },
          },
          create: { userId, boostId: item.id, charges: 1 },
          update: { charges: { increment: 1 } },
        });
      }

      return { coins: paidUser.coins, itemId: item.id, alreadyApplied: false };
    });
  }

  /** Graded quiz earn â€” only ChallengeService may call (server scored). */
  async earnQuizGraded(
    userId: string,
    correct: boolean,
    amounts: { correctCoins: number; wrongCoins: number },
  ) {
    return this.earn.earnQuizGraded(userId, correct, amounts);
  }

  /** Daily scratch coin payout â€” only ScratchService may call. */
  async earnScratchCoins(
    userId: string,
    day: string,
    slot: number,
    amount: number,
  ) {
    return this.earn.earnScratchCoins(userId, day, slot, amount);
  }

  async requireUserPublic(userId: string) {
    return this.requireUser(userId);
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
// --- End: Economy live wire (Sachin) ---
