import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import { SettingsService } from '../settings/settings.service';
import { maskRedeemCode } from './redeem-mask';
import { relativeRedeemLabel } from './redeem-labels';

@Injectable()
export class RedeemClaimsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

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
      whenLabel: relativeRedeemLabel(r.createdAt),
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
      redeemCode: {
        id: string;
        title: string;
        stockLeft: number;
        valueLabel: string;
      };
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
      whenLabel: relativeRedeemLabel(r.createdAt),
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
    if (
      id.length < 10 ||
      id.length > 40 ||
      id.includes('/') ||
      !/^[a-z0-9_-]+$/i.test(id)
    ) {
      throw new AppError('CLAIM_BAD_ID', 'Invalid claim id.', 400);
    }
  }
}
