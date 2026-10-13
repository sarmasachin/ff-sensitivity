import { Injectable } from '@nestjs/common';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  PROFILE_REGIONS,
  PROFILE_ROLES,
  cleanChoice,
  cleanDisplayName,
  cleanFfUid,
} from './user-profile.options';

@Injectable()
export class UserProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string) {
    const user = await this.load(userId);
    return { profile: this.toView(user) };
  }

  async update(userId: string, dto: UpdateProfileDto) {
    const displayName = cleanDisplayName(dto.displayName);
    const ffUid = cleanFfUid(dto.ffUid);
    const playRole = cleanChoice(dto.playRole, PROFILE_ROLES);
    const region = cleanChoice(dto.region, PROFILE_REGIONS);
    if (!displayName || ffUid == null || playRole == null || region == null) {
      throw new AppError('PROFILE_INVALID', 'Check the profile fields and try again.', 400);
    }
    const prior = await this.load(userId);
    const googleName = prior.googleName.trim() || prior.displayName;
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName,
        googleName,
        ffUid,
        playRole,
        region,
        notifyPush: dto.notifyPush,
      },
    });
    await this.syncPush(userId, dto.notifyPush);
    return { profile: this.toView(user) };
  }

  async deleteAccount(userId: string) {
    const before = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!before) {
      throw new AppError('USER_NOT_FOUND', 'User not found.', 404);
    }
    if (before.dataDeletedAt) {
      return { ok: true as const };
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
        data: { userId: null, pushEnabled: false },
      });
      await tx.redeemCodeSecret.updateMany({
        where: { assignedUserId: userId },
        data: { assignedUserId: null, assignedAt: null },
      });
      await tx.user.update({
        where: { id: userId },
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
          googleBanned: false,
          tokenVersion: { increment: 1 },
          dataDeletedAt: new Date(),
          lastLoginAt: null,
        },
      });
    });
    return { ok: true as const };
  }

  private async syncPush(userId: string, notifyPush: boolean) {
    if (!notifyPush) {
      await this.prisma.devicePushToken.updateMany({
        where: { userId },
        data: { pushEnabled: false },
      });
      await this.prisma.deviceInstall.updateMany({
        where: { userId },
        data: { pushEnabled: false },
      });
      return;
    }
    const latest = await this.prisma.devicePushToken.findFirst({
      where: { userId },
      orderBy: { lastSeenAt: 'desc' },
      select: { id: true },
    });
    if (latest) {
      await this.prisma.devicePushToken.update({
        where: { id: latest.id },
        data: { pushEnabled: true },
      });
    }
    await this.prisma.deviceInstall.updateMany({
      where: { userId },
      data: { pushEnabled: true },
    });
  }

  private async load(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive || user.dataDeletedAt) {
      throw new AppError('AUTH_REQUIRED', 'Please sign in again.', 401);
    }
    return user;
  }

  private toView(user: {
    googleName: string;
    displayName: string;
    email: string;
    photoUrl: string | null;
    ffUid: string;
    playRole: string;
    region: string;
    notifyPush: boolean;
    coins: number;
    streakDays: number;
  }) {
    return {
      googleName: user.googleName.trim() || user.displayName,
      email: user.email,
      photoUrl: user.photoUrl,
      displayName: user.displayName,
      ffUid: user.ffUid,
      playRole: user.playRole,
      region: user.region,
      notifyPush: user.notifyPush,
      coins: user.coins,
      streakDays: user.streakDays,
    };
  }
}
