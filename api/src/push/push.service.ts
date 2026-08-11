import { Injectable } from '@nestjs/common';
import { AdminRole, PushAudience, PushStatus } from '@prisma/client';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import type {
  RegisterPushDeviceDto,
  UpsertPushCampaignDto,
} from './dto/push.dto';
import {
  assertSafeDeepLink,
  assertSafePushText,
  assertTopic,
  parseStamp,
  sanitizePushText,
  stamp,
} from './push-security';
import { sendFcmCampaign } from './push-fcm';
import { DevicesService } from '../devices/devices.service';
import { assertInstallId } from '../devices/devices-security';
// --- Start: Push live wire (Sachin) ---
const MAX_CAMPAIGNS = 100;

function assertCampaignId(id: string): string {
  const clean = sanitizePushText(id, 64).toLowerCase();
  if (!/^[a-z0-9_]{1,64}$/.test(clean)) {
    throw new AppError('PUSH_BAD_ID', 'Campaign id is invalid.', 400);
  }
  return clean;
}

@Injectable()
export class PushService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly devices: DevicesService,
  ) {}

  private toRow(c: {
    id: string;
    title: string;
    body: string;
    deepLink: string;
    audience: PushAudience;
    topic: string;
    status: PushStatus;
    scheduledAt: Date | null;
    sentAt: Date | null;
    delivered: number;
    failed: number;
    createdBy: string;
    updatedAt: Date;
  }) {
    return {
      id: c.id,
      title: c.title,
      body: c.body,
      deepLink: c.deepLink,
      audience: c.audience,
      topic: c.topic,
      status: c.status,
      scheduledAt: stamp(c.scheduledAt),
      sentAt: stamp(c.sentAt),
      delivered: c.delivered,
      failed: c.failed,
      createdBy: c.createdBy,
      updatedAt: stamp(c.updatedAt) ?? '',
    };
  }

  async adminList() {
    const rows = await this.prisma.pushCampaign.findMany({
      orderBy: { updatedAt: 'desc' },
      take: MAX_CAMPAIGNS,
    });
    return { campaigns: rows.map((r) => this.toRow(r)) };
  }

  async adminUpsert(admin: AuthAdmin, dto: UpsertPushCampaignDto) {
    const title = sanitizePushText(dto.title, 65);
    const body = sanitizePushText(dto.body, 180);
    if (!title) throw new AppError('PUSH_VALIDATION', 'Title is required.', 400);
    if (!body) throw new AppError('PUSH_VALIDATION', 'Body is required.', 400);
    assertSafePushText(title, 'Title');
    assertSafePushText(body, 'Body');
    const deepLink = assertSafeDeepLink(dto.deepLink);
    const audience = dto.audience as PushAudience;
    let topic = '';
    if (audience === PushAudience.TOPIC) {
      topic = assertTopic(dto.topic ?? '');
    }

    let status: PushStatus = PushStatus.DRAFT;
    let scheduledAt: Date | null = null;
    if (dto.scheduleMode === 'later') {
      if (!dto.scheduledAt) {
        throw new AppError('PUSH_BAD_STAMP', 'Schedule stamp required.', 400);
      }
      status = PushStatus.SCHEDULED;
      scheduledAt = parseStamp(dto.scheduledAt);
    }

    const existing = await this.prisma.pushCampaign.findUnique({
      where: { id: dto.id },
    });
    if (
      existing &&
      (existing.status === PushStatus.SENT ||
        existing.status === PushStatus.FAILED)
    ) {
      throw new AppError(
        'PUSH_LOCKED',
        'Sent/failed campaigns cannot be edited.',
        400,
      );
    }

    const count = await this.prisma.pushCampaign.count();
    if (!existing && count >= MAX_CAMPAIGNS) {
      throw new AppError('PUSH_LIMIT', 'Campaign limit reached.', 400);
    }

    const createdBy =
      existing?.createdBy ??
      (admin.email.split('@')[0] || 'admin').slice(0, 40);

    const row = await this.prisma.pushCampaign.upsert({
      where: { id: dto.id },
      create: {
        id: dto.id,
        title,
        body,
        deepLink,
        audience,
        topic,
        status,
        scheduledAt,
        createdBy,
      },
      update: {
        title,
        body,
        deepLink,
        audience,
        topic,
        status,
        scheduledAt,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorAdminId: admin.id,
        action: existing ? 'push.update' : 'push.create',
        entity: 'push_campaign',
        afterJson: { id: row.id, status: row.status, audience: row.audience },
      },
    });

    return { campaign: this.toRow(row) };
  }

  async adminSend(admin: AuthAdmin, id: string) {
    id = assertCampaignId(id);
    if (
      admin.role !== AdminRole.SUPER_ADMIN &&
      admin.role !== AdminRole.ADMIN
    ) {
      throw new AppError(
        'PUSH_SEND_FORBIDDEN',
        'Only Super Admin / Admin can send push campaigns.',
        403,
      );
    }

    const campaign = await this.prisma.pushCampaign.findUnique({ where: { id } });
    if (!campaign) {
      throw new AppError('PUSH_NOT_FOUND', 'Campaign not found.', 404);
    }
    if (
      campaign.status !== PushStatus.DRAFT &&
      campaign.status !== PushStatus.SCHEDULED
    ) {
      throw new AppError(
        'PUSH_BAD_STATUS',
        'Only draft or scheduled campaigns can be sent.',
        400,
      );
    }

    const tokens = await this.resolveAudienceTokens(campaign);
    let delivered = 0;
    let failed = 0;
    let mode: 'fcm' | 'token_ledger' = 'token_ledger';
    try {
      const fcm = await sendFcmCampaign({
        title: campaign.title,
        body: campaign.body,
        deepLink: campaign.deepLink,
        audience: campaign.audience,
        topic: campaign.topic,
        tokens,
        campaignId: campaign.id,
      });
      delivered = fcm.delivered;
      failed = fcm.failed;
      await this.markSuspectedUninstalls(fcm.unregisteredTokens);
      mode = 'fcm';
    } catch (e) {
      // Fallback: keep campaign sent for inbox even if FCM creds missing in some envs.
      if (
        e instanceof AppError &&
        e.code === 'PUSH_FCM_UNCONFIGURED'
      ) {
        delivered = tokens.length;
        mode = 'token_ledger';
      } else {
        throw e;
      }
    }

    const updated = await this.prisma.pushCampaign.update({
      where: { id },
      data: {
        status: PushStatus.SENT,
        sentAt: new Date(),
        delivered,
        failed,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorAdminId: admin.id,
        action: 'push.send',
        entity: 'push_campaign',
        afterJson: {
          id,
          delivered,
          failed,
          audience: campaign.audience,
          mode,
        },
      },
    });

    return { campaign: this.toRow(updated) };
  }

  /**
   * FCM only exposes this after a direct token send. It is a suspected
   * uninstall signal (or an invalidated app instance), never a definitive
   * Play Store uninstall count.
   */
  private async markSuspectedUninstalls(tokens: string[]) {
    if (tokens.length === 0) return;
    const rows = await this.prisma.devicePushToken.findMany({
      where: { token: { in: tokens } },
      select: { installId: true },
    });
    const installIds = [
      ...new Set(rows.map((row) => row.installId).filter(Boolean) as string[]),
    ];
    // Disable only the dead tokens — never wipe the whole install if another
    // enabled token still exists (token rotate / multi-token race).
    await this.prisma.devicePushToken.updateMany({
      where: { token: { in: tokens } },
      data: { pushEnabled: false },
    });
    for (const installId of installIds) {
      const stillLive = await this.prisma.devicePushToken.findFirst({
        where: { installId, pushEnabled: true },
        select: { token: true },
      });
      if (stillLive) {
        await this.prisma.deviceInstall.updateMany({
          where: { installId },
          data: {
            hasFcmToken: true,
            fcmTokenHint: `${stillLive.token.slice(0, 4)}…${stillLive.token.slice(-4)}`,
            pushEnabled: true,
            uninstallSuspectedAt: null,
          },
        });
      } else {
        await this.prisma.deviceInstall.updateMany({
          where: { installId },
          data: {
            hasFcmToken: false,
            fcmTokenHint: '',
            pushEnabled: false,
            uninstallSuspectedAt: new Date(),
          },
        });
      }
    }
  }

  async adminCancel(admin: AuthAdmin, id: string) {
    id = assertCampaignId(id);
    const campaign = await this.prisma.pushCampaign.findUnique({ where: { id } });
    if (!campaign) {
      throw new AppError('PUSH_NOT_FOUND', 'Campaign not found.', 404);
    }
    if (
      campaign.status !== PushStatus.DRAFT &&
      campaign.status !== PushStatus.SCHEDULED
    ) {
      throw new AppError(
        'PUSH_BAD_STATUS',
        'Only draft or scheduled campaigns can be cancelled.',
        400,
      );
    }
    const updated = await this.prisma.pushCampaign.update({
      where: { id },
      data: { status: PushStatus.CANCELLED },
    });
    await this.prisma.auditLog.create({
      data: {
        actorAdminId: admin.id,
        action: 'push.cancel',
        entity: 'push_campaign',
        afterJson: { id },
      },
    });
    return { campaign: this.toRow(updated) };
  }

  async adminDelete(admin: AuthAdmin, id: string) {
    id = assertCampaignId(id);
    const campaign = await this.prisma.pushCampaign.findUnique({ where: { id } });
    if (!campaign) {
      throw new AppError('PUSH_NOT_FOUND', 'Campaign not found.', 404);
    }
    await this.prisma.pushCampaign.delete({ where: { id } });
    await this.prisma.auditLog.create({
      data: {
        actorAdminId: admin.id,
        action: 'push.delete',
        entity: 'push_campaign',
        afterJson: { id, status: campaign.status },
      },
    });
    return { ok: true };
  }

  async registerDevice(userId: string, dto: RegisterPushDeviceDto) {
    const token = sanitizePushText(dto.token, 512);
    if (token.length < 8) {
      throw new AppError('PUSH_BAD_TOKEN', 'Device token is invalid.', 400);
    }
    if (/[\s<>]/.test(token) || token.toLowerCase().includes('javascript:')) {
      throw new AppError('PUSH_BAD_TOKEN', 'Device token is invalid.', 400);
    }
    const platform = dto.platform === 'ios' ? 'ios' : 'android';
    const topics = (dto.topics ?? [])
      .map((t) => sanitizePushText(t, 64).toLowerCase())
      .filter((t) => /^[a-z0-9_]{1,64}$/.test(t))
      .slice(0, 20);

    let installId: string | undefined;
    if (dto.installId) {
      await this.devices.assertInstallNotBlocked(dto.installId);
      installId = assertInstallId(dto.installId);
    }

    const row = await this.prisma.devicePushToken.upsert({
      where: { token },
      create: {
        userId,
        token,
        platform,
        topics,
        installId,
        pushEnabled: true,
        lastSeenAt: new Date(),
      },
      update: {
        userId,
        platform,
        topics,
        ...(installId ? { installId } : {}),
        pushEnabled: true,
        lastSeenAt: new Date(),
      },
    });
    // One live token per Google account. Reinstall / emulator leftovers
    // must not keep receiving or inflating "devices delivered".
    await this.retireOtherUserTokens(userId, token, installId);

    return {
      ok: true,
      platform: row.platform,
      topics: row.topics,
      // Never echo full token back.
      tokenHint: `${token.slice(0, 4)}…${token.slice(-4)}`,
    };
  }

  async inbox(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });
    if (!user) {
      return { messages: [] };
    }
    // Hide long pre-signup history, but keep the last 7 days so a new
    // account still sees a blast that was sent just before they signed up.
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const since =
      user.createdAt.getTime() < weekAgo.getTime() ? user.createdAt : weekAgo;

    const [tokens, claimCount, rows] = await Promise.all([
      this.prisma.devicePushToken.findMany({
        where: { userId, pushEnabled: true },
        select: { topics: true },
      }),
      this.prisma.redeemClaim.count({ where: { userId } }),
      this.prisma.pushCampaign.findMany({
        where: {
          status: PushStatus.SENT,
          sentAt: { gte: since },
        },
        orderBy: { sentAt: 'desc' },
        take: 40,
      }),
    ]);
    const topics = new Set(tokens.flatMap((t) => t.topics));
    const hasClaim = claimCount > 0;

    const messages = rows
      .filter((r) => {
        if (r.audience === PushAudience.ALL) return true;
        if (r.audience === PushAudience.ACTIVE_7D) return true;
        if (r.audience === PushAudience.NO_CLAIM) return !hasClaim;
        if (r.audience === PushAudience.TOPIC) {
          return Boolean(r.topic) && topics.has(r.topic);
        }
        return false;
      })
      .slice(0, 20)
      .map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        deepLink: r.deepLink,
        sentAt: stamp(r.sentAt),
      }));

    return { messages };
  }

  private async resolveAudienceTokens(campaign: {
    audience: PushAudience;
    topic: string;
  }): Promise<string[]> {
    const enabled = { pushEnabled: true as const };
    let rows: {
      token: string;
      userId: string;
      installId: string | null;
      lastSeenAt: Date;
    }[] = [];
    const select = {
      token: true,
      userId: true,
      installId: true,
      lastSeenAt: true,
    } as const;
    if (campaign.audience === PushAudience.ALL) {
      rows = await this.prisma.devicePushToken.findMany({
        where: enabled,
        select,
        orderBy: { lastSeenAt: 'desc' },
        take: 5000,
      });
    } else if (campaign.audience === PushAudience.ACTIVE_7D) {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      rows = await this.prisma.devicePushToken.findMany({
        where: { ...enabled, lastSeenAt: { gte: since } },
        select,
        orderBy: { lastSeenAt: 'desc' },
        take: 5000,
      });
    } else if (campaign.audience === PushAudience.NO_CLAIM) {
      rows = await this.prisma.devicePushToken.findMany({
        where: {
          ...enabled,
          user: { claims: { none: {} } },
        },
        select,
        orderBy: { lastSeenAt: 'desc' },
        take: 5000,
      });
    } else {
      rows = await this.prisma.devicePushToken.findMany({
        where: {
          ...enabled,
          topics: { has: campaign.topic },
        },
        select,
        orderBy: { lastSeenAt: 'desc' },
        take: 5000,
      });
    }
    const allowed = await this.devices.filterEnabledTokens(rows);
    return this.keepLatestTokenPerUser(allowed);
  }

  /**
   * Uninstall/reinstall creates a new installId but leaves old tokens enabled.
   * Keep only the newest token per user and disable the rest in DB.
   */
  private async keepLatestTokenPerUser(
    rows: {
      token: string;
      userId: string;
      installId: string | null;
      lastSeenAt: Date;
    }[],
  ): Promise<string[]> {
    const best = new Map<
      string,
      {
        token: string;
        installId: string | null;
        lastSeenAt: number;
      }
    >();
    for (const row of rows) {
      const seen = row.lastSeenAt?.getTime?.() ?? 0;
      const prev = best.get(row.userId);
      if (!prev || seen >= prev.lastSeenAt) {
        best.set(row.userId, {
          token: row.token,
          installId: row.installId,
          lastSeenAt: seen,
        });
      }
    }
    const keepTokens = new Set([...best.values()].map((v) => v.token));
    const stale = rows.filter((row) => !keepTokens.has(row.token));
    if (stale.length > 0) {
      await this.prisma.devicePushToken.updateMany({
        where: { token: { in: stale.map((row) => row.token) } },
        data: { pushEnabled: false },
      });
      const staleInstalls = [
        ...new Set(
          stale
            .map((row) => row.installId)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      if (staleInstalls.length > 0) {
        await this.prisma.deviceInstall.updateMany({
          where: { installId: { in: staleInstalls } },
          data: {
            hasFcmToken: false,
            pushEnabled: false,
            uninstallSuspectedAt: new Date(),
          },
        });
      }
    }
    return [...best.values()].map((v) => v.token);
  }

  private async retireOtherUserTokens(
    userId: string,
    liveToken: string,
    liveInstallId?: string,
  ) {
    await this.prisma.devicePushToken.updateMany({
      where: { userId, token: { not: liveToken } },
      data: { pushEnabled: false },
    });
    if (liveInstallId) {
      // Same phone, new Google account: stop the previous owner's token.
      await this.prisma.devicePushToken.updateMany({
        where: { installId: liveInstallId, token: { not: liveToken } },
        data: { pushEnabled: false },
      });
      await this.prisma.deviceInstall.updateMany({
        where: { userId, installId: { not: liveInstallId } },
        data: {
          hasFcmToken: false,
          pushEnabled: false,
          uninstallSuspectedAt: new Date(),
        },
      });
      await this.prisma.deviceInstall.updateMany({
        where: { installId: liveInstallId, userId },
        data: {
          hasFcmToken: true,
          fcmTokenHint: `${liveToken.slice(0, 4)}…${liveToken.slice(-4)}`,
          pushEnabled: true,
          uninstallSuspectedAt: null,
        },
      });
    }
  }

  private async resolveAudienceCount(campaign: {
    audience: PushAudience;
    topic: string;
  }): Promise<number> {
    return (await this.resolveAudienceTokens(campaign)).length;
  }
}
// --- End: Push live wire (Sachin) ---
