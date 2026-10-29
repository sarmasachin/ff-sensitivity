import { Injectable } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import { SettingsService } from '../settings/settings.service';
import type { WalletAdjustDto } from './dto/wallets.dto';
import {
  loadWalletLifetime,
  loadWalletLifetimes,
  countWalletDeskStats,
  type WalletLife,
} from './wallets-desk';
import {
  MAX_COINS,
  assertAdjustAmount,
  assertRequestId,
  assertSafeWalletText,
  assertUserId,
  formatWhen,
  hoursAgo,
  mapLedgerActor,
  mapLedgerKind,
  maskEmail,
  sanitizeWalletText,
} from './wallets-security';

const walletUserSelect = {
  id: true,
  email: true,
  displayName: true,
  coins: true,
  walletFrozen: true,
  walletNote: true,
  deviceInstalls: {
    orderBy: { lastSeenAt: 'desc' as const },
    take: 1,
    select: { installId: true, brand: true, model: true },
  },
};

// --- Start: Wallets admin live wire (Sachin) ---
@Injectable()
export class WalletsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  private assertCanMutate(admin: AuthAdmin) {
    if (admin.role === AdminRole.VIEWER) {
      throw new AppError(
        'FORBIDDEN_ROLE',
        'Viewers cannot change wallets.',
        403,
      );
    }
  }

  private toWalletRow(
    user: {
      id: string;
      email: string;
      displayName: string;
      coins: number;
      walletFrozen: boolean;
      walletNote: string;
      deviceInstalls: { installId: string; brand: string; model: string }[];
    },
    life: WalletLife | undefined,
    now = new Date(),
  ) {
    const install = user.deviceInstalls[0];
    const deviceId = install?.installId ?? `user_${user.id.slice(-8)}`;
    const label =
      install?.model || install?.brand
        ? [install.model || install.brand, maskEmail(user.email)]
            .filter(Boolean)
            .join(' · ')
        : `${user.displayName || 'User'} · ${maskEmail(user.email)}`;
    const last = life?.lastAt ?? null;
    const h = last ? hoursAgo(last, now) : hoursAgo(now, now);
    return {
      id: user.id,
      deviceId,
      label,
      balance: user.coins,
      lifetimeEarned: life?.earned ?? 0,
      lifetimeSpent: life?.spent ?? 0,
      status: user.walletFrozen ? ('FROZEN' as const) : ('ACTIVE' as const),
      lastTxnLabel: last ? formatWhen(h) : '—',
      lastTxnHoursAgo: last ? Math.round(h * 10) / 10 : 9999,
      note: user.walletNote,
    };
  }

  private async walletRowById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: walletUserSelect,
    });
    if (!user) return undefined;
    const life = await loadWalletLifetime(this.prisma, userId);
    return this.toWalletRow(user, life, new Date());
  }

  async adminListWallets() {
    const [users, lives, stats] = await Promise.all([
      this.prisma.user.findMany({
        orderBy: { updatedAt: 'desc' },
        select: walletUserSelect,
      }),
      loadWalletLifetimes(this.prisma),
      countWalletDeskStats(this.prisma),
    ]);
    const now = new Date();
    return {
      wallets: users.map((u) => this.toWalletRow(u, lives.get(u.id), now)),
      stats,
    };
  }

  async adminListLedger() {
    const rows = await this.prisma.walletLedger.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            deviceInstalls: {
              orderBy: { lastSeenAt: 'desc' },
              take: 1,
              select: { installId: true, model: true, brand: true },
            },
          },
        },
      },
    });
    const now = new Date();
    return {
      ledger: rows.map((r) => {
        const install = r.user.deviceInstalls[0];
        const deviceId = install?.installId ?? `user_${r.userId.slice(-8)}`;
        const label =
          install?.model ||
          install?.brand ||
          r.user.displayName ||
          maskEmail(r.user.email);
        const h = hoursAgo(r.createdAt, now);
        return {
          id: r.id,
          walletId: r.userId,
          deviceId,
          label,
          kind: mapLedgerKind(r.reason, r.delta),
          amount: r.delta,
          balanceAfter: r.balanceAfter,
          reason: r.reason,
          whenLabel: formatWhen(h),
          actor: mapLedgerActor(r.reason),
        };
      }),
    };
  }

  async adminGrant(admin: AuthAdmin, userIdRaw: string, dto: WalletAdjustDto) {
    this.assertCanMutate(admin);
    await this.settings.assertStepUp(
      admin.id,
      dto.currentPassword,
      'wallet',
    );
    const userId = assertUserId(userIdRaw);
    const amount = assertAdjustAmount(dto.amount);
    const reasonText = sanitizeWalletText(dto.reason, 200);
    assertSafeWalletText(reasonText, 'Reason');
    if (reasonText.length < 3) {
      throw new AppError('WALLET_BAD_REASON', 'Reason is required.', 400);
    }
    const requestId = assertRequestId(dto.requestId);
    const idempotencyKey = `staff:grant:${userId}:${requestId}`;

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.walletLedger.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        return { coins: existing.balanceAfter, alreadyApplied: true };
      }
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user || !user.isActive) {
        throw new AppError('WALLET_NOT_FOUND', 'Wallet not found.', 404);
      }
      if (user.walletFrozen) {
        throw new AppError(
          'WALLET_FROZEN',
          'Unfreeze the wallet before granting coins.',
          409,
        );
      }
      const nextCoins = Math.min(MAX_COINS, user.coins + amount);
      const delta = nextCoins - user.coins;
      if (delta <= 0) {
        throw new AppError('WALLET_CAP', 'Balance already at max.', 409);
      }
      await tx.user.update({
        where: { id: userId },
        data: {
          coins: nextCoins,
          walletNote: sanitizeWalletText(`Grant: ${reasonText}`, 400),
        },
      });
      await tx.walletLedger.create({
        data: {
          userId,
          delta,
          balanceAfter: nextCoins,
          reason: `staff:grant:${reasonText}`.slice(0, 200),
          idempotencyKey,
        },
      });
      return { coins: nextCoins, alreadyApplied: false };
    });

    await this.prisma.auditLog.create({
      data: {
        actorAdminId: admin.id,
        action: 'wallets.grant',
        entity: 'user',
        afterJson: { userId, amount, requestId, ...result },
      },
    });
    const wallet = await this.walletRowById(userId);
    return { wallet, ...result };
  }

  async adminRevoke(admin: AuthAdmin, userIdRaw: string, dto: WalletAdjustDto) {
    this.assertCanMutate(admin);
    await this.settings.assertStepUp(
      admin.id,
      dto.currentPassword,
      'wallet',
    );
    const userId = assertUserId(userIdRaw);
    const amount = assertAdjustAmount(dto.amount);
    const reasonText = sanitizeWalletText(dto.reason, 200);
    assertSafeWalletText(reasonText, 'Reason');
    if (reasonText.length < 3) {
      throw new AppError('WALLET_BAD_REASON', 'Reason is required.', 400);
    }
    const requestId = assertRequestId(dto.requestId);
    const idempotencyKey = `staff:revoke:${userId}:${requestId}`;

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.walletLedger.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        return { coins: existing.balanceAfter, alreadyApplied: true };
      }
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user || !user.isActive) {
        throw new AppError('WALLET_NOT_FOUND', 'Wallet not found.', 404);
      }
      if (user.coins < amount) {
        throw new AppError(
          'WALLET_INSUFFICIENT',
          `Cannot revoke ${amount} — balance is ${user.coins}.`,
          409,
        );
      }
      const paid = await tx.user.updateMany({
        where: { id: userId, coins: { gte: amount } },
        data: {
          coins: { decrement: amount },
          walletNote: sanitizeWalletText(`Revoke: ${reasonText}`, 400),
        },
      });
      if (paid.count !== 1) {
        throw new AppError(
          'WALLET_INSUFFICIENT',
          'Insufficient balance.',
          409,
        );
      }
      const updated = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      await tx.walletLedger.create({
        data: {
          userId,
          delta: -amount,
          balanceAfter: updated.coins,
          reason: `staff:revoke:${reasonText}`.slice(0, 200),
          idempotencyKey,
        },
      });
      return { coins: updated.coins, alreadyApplied: false };
    });

    await this.prisma.auditLog.create({
      data: {
        actorAdminId: admin.id,
        action: 'wallets.revoke',
        entity: 'user',
        afterJson: { userId, amount, requestId, ...result },
      },
    });
    const wallet = await this.walletRowById(userId);
    return { wallet, ...result };
  }

  async adminFreeze(
    admin: AuthAdmin,
    userIdRaw: string,
    action: 'freeze' | 'unfreeze',
  ) {
    this.assertCanMutate(admin);
    const userId = assertUserId(userIdRaw);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new AppError('WALLET_NOT_FOUND', 'Wallet not found.', 404);
    }
    const frozen = action === 'freeze';
    const note = frozen
      ? sanitizeWalletText(`${user.walletNote} · Frozen by staff.`.trim(), 400)
      : 'Unfrozen by staff. Earn/spend restored.';
    await this.prisma.user.update({
      where: { id: userId },
      data: { walletFrozen: frozen, walletNote: note },
    });
    const idempotencyKey = `staff:${action}:${userId}:${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await this.prisma.walletLedger.create({
      data: {
        userId,
        delta: 0,
        balanceAfter: user.coins,
        reason: frozen ? 'staff:freeze' : 'staff:unfreeze',
        idempotencyKey,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        actorAdminId: admin.id,
        action: `wallets.${action}`,
        entity: 'user',
        afterJson: { userId, walletFrozen: frozen },
      },
    });
    return { wallet: await this.walletRowById(userId) };
  }
}
// --- End: Wallets admin live wire (Sachin) ---
