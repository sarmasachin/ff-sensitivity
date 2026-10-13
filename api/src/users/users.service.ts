import { Injectable } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import type { UserNoteDto, UserStatusDto } from './dto/users.dto';
import {
  assertSafeUserText,
  assertUserId,
  sanitizeUserText,
} from './users-security';
import { installSelect, toUserRow, userListSelect } from './users-row';

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
      select: installSelect,
    });
    const byInstall = new Map(extras.map((row) => [row.installId, row]));
    return users.map((user) => {
      if (user.deviceInstalls.length > 0) return user;
      const installId = installIdByUser.get(user.id);
      const shared = installId ? byInstall.get(installId) : undefined;
      return shared ? { ...user, deviceInstalls: [shared] } : user;
    });
  }

  private async loadRow(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: userListSelect,
    });
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 'User not found.', 404);
    }
    const [resolved] = await this.attachSharedInstalls([user]);
    return toUserRow(resolved);
  }

  async adminListUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 500,
      select: userListSelect,
    });
    const now = new Date();
    const resolved = await this.attachSharedInstalls(users);
    return { users: resolved.map((u) => toUserRow(u, now)) };
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
    if (before.googleBanned) {
      throw new AppError(
        'USER_STATUS_CONFLICT',
        'This Gmail is banned after data delete. Cannot restore.',
        409,
      );
    }
    if (before.dataDeletedAt) {
      throw new AppError(
        'USER_STATUS_CONFLICT',
        'This account was deleted by the user. They can sign in again with the same Google account.',
        409,
      );
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
      const changed = await tx.user.updateMany({
        where: { id: userId, dataDeletedAt: null },
        data,
      });
      if (changed.count !== 1) {
        throw new AppError(
          'USER_STATUS_CONFLICT',
          'This Gmail is banned after data delete. Cannot restore.',
          409,
        );
      }
      const updated = await tx.user.findUnique({ where: { id: userId } });
      if (!updated) {
        throw new AppError('USER_NOT_FOUND', 'User not found.', 404);
      }
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

  async adminDeleteData(admin: AuthAdmin, userIdRaw: string) {
    this.assertCanMutate(admin);
    const userId = assertUserId(userIdRaw);
    const before = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!before) {
      throw new AppError('USER_NOT_FOUND', 'User not found.', 404);
    }
    if (before.dataDeletedAt) {
      throw new AppError(
        'USER_STATUS_CONFLICT',
        'App data for this Gmail is already deleted.',
        409,
      );
    }
    if (before.isActive) {
      throw new AppError(
        'USER_STATUS_CONFLICT',
        'Suspend the account before deleting data.',
        409,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.communityPostReport.deleteMany({ where: { userId } });
      await tx.communityPost.deleteMany({ where: { userId } });
      await tx.redeemClaim.deleteMany({ where: { userId } });
      await tx.redeemCodeVote.deleteMany({ where: { userId } });
      await tx.redeemCodeComment.deleteMany({ where: { userId } });
      await tx.redeemScratchRoll.deleteMany({ where: { userId } });
      await tx.redeemScratchPass.deleteMany({ where: { userId } });
      await tx.scratchArchiveEntry.deleteMany({ where: { userId } });
      await tx.sensitivityCompare.deleteMany({ where: { userId } });
      await tx.walletLedger.deleteMany({ where: { userId } });
      await tx.userBoostCharge.deleteMany({ where: { userId } });
      await tx.scratchRoll.deleteMany({ where: { userId } });
      await tx.supportThread.deleteMany({ where: { userId } });
      await tx.devicePushToken.deleteMany({ where: { userId } });
      await tx.appAnalyticsEvent.deleteMany({ where: { userId } });
      await tx.deviceInstall.updateMany({
        where: { userId },
        data: { userId: null },
      });
      await tx.redeemCodeSecret.updateMany({
        where: { assignedUserId: userId },
        data: { assignedUserId: null, assignedAt: null },
      });
      const wiped = await tx.user.updateMany({
        where: { id: userId, isActive: false, dataDeletedAt: null },
        data: {
          displayName: 'Deleted user',
          googleName: '',
          photoUrl: null,
          ffUid: '',
          playRole: '',
          region: '',
          notifyPush: false,
          coins: 0,
          streakDays: 0,
          lastCheckinDay: null,
          walletFrozen: false,
          walletNote: '',
          isActive: false,
          isRestricted: false,
          googleBanned: true,
          tokenVersion: { increment: 1 },
          dataDeletedAt: new Date(),
          lastLoginAt: null,
        },
      });
      if (wiped.count !== 1) {
        throw new AppError(
          'USER_STATUS_CONFLICT',
          'Suspend the account before deleting data.',
          409,
        );
      }
      await tx.auditLog.create({
        data: {
          actorAdminId: admin.id,
          action: 'user:delete-data',
          entity: `user:${userId}`,
          beforeJson: {
            isActive: before.isActive,
            coins: before.coins,
            email: before.email,
          },
          afterJson: {
            dataDeleted: true,
            googleBanned: true,
          },
        },
      });
    });

    return { user: await this.loadRow(userId) };
  }
}
// --- End: Users admin live wire (Sachin) ---
