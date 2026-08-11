import { Injectable } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import type { UserNoteDto, UserStatusDto } from './dto/users.dto';
import {
  assertSafeUserText,
  assertUserId,
  formatJoined,
  formatWhen,
  hoursAgo,
  mapAccountStatus,
  maskEmail,
  maskGoogleSub,
  sanitizeUserText,
} from './users-security';

// --- Start: Users admin live wire (Sachin) ---
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private assertCanMutate(admin: AuthAdmin) {
    if (admin.role === AdminRole.VIEWER) {
      throw new AppError(
        'FORBIDDEN_ROLE',
        'Viewers cannot change users.',
        403,
      );
    }
  }

  private readonly installSelect = {
    installId: true,
    userId: true,
    brand: true,
    model: true,
    androidVersion: true,
    appVersion: true,
    lastSeenAt: true,
  } as const;

  /** Same phone, second Google id: install stays on first user; token still has installId. */
  private async attachSharedInstalls<
    T extends {
      id: string;
      deviceInstalls: {
        installId: string;
        userId?: string | null;
        brand: string;
        model: string;
        androidVersion: string;
        appVersion: string;
        lastSeenAt: Date;
      }[];
    },
  >(users: T[]): Promise<T[]> {
    const missing = users.filter((u) => u.deviceInstalls.length === 0);
    if (missing.length === 0) return users;
    const tokens = await this.prisma.devicePushToken.findMany({
      where: {
        userId: { in: missing.map((u) => u.id) },
        installId: { not: null },
      },
      orderBy: { lastSeenAt: 'desc' },
      select: { userId: true, installId: true },
    });
    const installIdByUser = new Map<string, string>();
    for (const row of tokens) {
      if (row.installId && !installIdByUser.has(row.userId)) {
        installIdByUser.set(row.userId, row.installId);
      }
    }
    if (installIdByUser.size === 0) return users;
    const extras = await this.prisma.deviceInstall.findMany({
      where: { installId: { in: [...new Set(installIdByUser.values())] } },
      select: this.installSelect,
    });
    const byInstall = new Map(extras.map((row) => [row.installId, row]));
    return users.map((user) => {
      if (user.deviceInstalls.length > 0) return user;
      const installId = installIdByUser.get(user.id);
      const shared = installId ? byInstall.get(installId) : undefined;
      return shared ? { ...user, deviceInstalls: [shared] } : user;
    });
  }

  private toUserRow(
    user: {
      id: string;
      email: string;
      displayName: string;
      googleSub: string;
      coins: number;
      isActive: boolean;
      isRestricted: boolean;
      accountNote: string;
      createdAt: Date;
      lastLoginAt: Date | null;
      _count: { claims: number };
      deviceInstalls: {
        installId: string;
        userId: string | null;
        brand: string;
        model: string;
        androidVersion: string;
        appVersion: string;
        lastSeenAt: Date;
      }[];
    },
    now = new Date(),
  ) {
    const install = user.deviceInstalls[0];
    const ownsInstall = Boolean(install?.userId && install.userId === user.id);
    const activityAt =
      ownsInstall &&
      install.lastSeenAt &&
      (!user.lastLoginAt || install.lastSeenAt > user.lastLoginAt)
        ? install.lastSeenAt
        : (user.lastLoginAt ?? user.createdAt);
    const h = hoursAgo(activityAt, now);
    const deviceLabel = install
      ? [install.model || install.brand || 'Device', install.androidVersion]
          .filter(Boolean)
          .join(' · ')
      : '—';
    return {
      id: user.id,
      displayName: user.displayName || 'Player',
      email: maskEmail(user.email),
      googleSubMasked: maskGoogleSub(user.googleSub),
      status: mapAccountStatus(user.isActive, user.isRestricted),
      joinedLabel: formatJoined(user.createdAt),
      lastActiveLabel: formatWhen(h),
      lastActiveHoursAgo: Math.round(h * 10) / 10,
      deviceId: install?.installId ?? '—',
      deviceLabel,
      appVersion: install?.appVersion || '—',
      coinBalance: user.coins,
      claimsCount: user._count.claims,
      redeemUnlocks: user._count.claims,
      regionLabel: '—',
      note: user.accountNote,
    };
  }

  private async loadRow(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        googleSub: true,
        coins: true,
        isActive: true,
        isRestricted: true,
        accountNote: true,
        createdAt: true,
        lastLoginAt: true,
        _count: { select: { claims: true } },
        deviceInstalls: {
          orderBy: { lastSeenAt: 'desc' },
          take: 1,
          select: this.installSelect,
        },
      },
    });
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 'User not found.', 404);
    }
    const [resolved] = await this.attachSharedInstalls([user]);
    return this.toUserRow(resolved);
  }

  async adminListUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 500,
      select: {
        id: true,
        email: true,
        displayName: true,
        googleSub: true,
        coins: true,
        isActive: true,
        isRestricted: true,
        accountNote: true,
        createdAt: true,
        lastLoginAt: true,
        _count: { select: { claims: true } },
        deviceInstalls: {
          orderBy: { lastSeenAt: 'desc' },
          take: 1,
          select: this.installSelect,
        },
      },
    });
    const now = new Date();
    const resolved = await this.attachSharedInstalls(users);
    return { users: resolved.map((u) => this.toUserRow(u, now)) };
  }

  async adminSetStatus(
    admin: AuthAdmin,
    userIdRaw: string,
    dto: UserStatusDto,
  ) {
    this.assertCanMutate(admin);
    const userId = assertUserId(userIdRaw);
    const note = sanitizeUserText(dto.note ?? '', 400);
    if (note) assertSafeUserText(note, 'Note');

    const before = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!before) {
      throw new AppError('USER_NOT_FOUND', 'User not found.', 404);
    }

    let data: {
      isActive: boolean;
      isRestricted: boolean;
      accountNote?: string;
      tokenVersion?: { increment: number };
    };
    if (dto.action === 'suspend') {
      data = {
        isActive: false,
        isRestricted: false,
        tokenVersion: { increment: 1 },
      };
    } else if (dto.action === 'restrict') {
      // Never unsuspend via restrict — must restore first.
      if (!before.isActive) {
        throw new AppError(
          'USER_STATUS_CONFLICT',
          'Restore the account before restricting.',
          409,
        );
      }
      data = { isActive: true, isRestricted: true };
    } else {
      data = { isActive: true, isRestricted: false };
    }
    if (note) data.accountNote = note;

    const after = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data,
      });
      await tx.auditLog.create({
        data: {
          actorAdminId: admin.id,
          action: `user:${dto.action}`,
          entity: `user:${userId}`,
          beforeJson: {
            isActive: before.isActive,
            isRestricted: before.isRestricted,
          },
          afterJson: {
            isActive: updated.isActive,
            isRestricted: updated.isRestricted,
          },
        },
      });
      return updated;
    });

    return { user: await this.loadRow(after.id) };
  }

  async adminSetNote(admin: AuthAdmin, userIdRaw: string, dto: UserNoteDto) {
    this.assertCanMutate(admin);
    const userId = assertUserId(userIdRaw);
    const note = sanitizeUserText(dto.note, 400);
    assertSafeUserText(note, 'Note');

    const before = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!before) {
      throw new AppError('USER_NOT_FOUND', 'User not found.', 404);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { accountNote: note },
      });
      await tx.auditLog.create({
        data: {
          actorAdminId: admin.id,
          action: 'user:note',
          entity: `user:${userId}`,
          beforeJson: { note: before.accountNote },
          afterJson: { note },
        },
      });
    });

    return { user: await this.loadRow(userId) };
  }
}
// --- End: Users admin live wire (Sachin) ---
