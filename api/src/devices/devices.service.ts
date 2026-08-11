import { Injectable } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import type { DeviceHeartbeatDto, PatchDeviceNoteDto } from './dto/devices.dto';
import {
  assertInstallId,
  assertSafeDeviceText,
  computeDeviceStatus,
  formatLastSeen,
  hoursAgo,
  maskFcmToken,
  sanitizeDeviceText,
} from './devices-security';

// --- Start: Devices live wire (Sachin) ---
@Injectable()
export class DevicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
  ) {}

  private toRow(
    row: {
      id: string;
      installId: string;
      brand: string;
      model: string;
      androidVersion: string;
      appVersion: string;
      appVersionCode: number;
      fcmTokenHint: string;
      hasFcmToken: boolean;
      pushEnabled: boolean;
      blocked: boolean;
      note: string;
      lastSeenAt: Date;
      user?: { coins: number } | null;
    },
    now = new Date(),
  ) {
    const status = computeDeviceStatus({
      blocked: row.blocked,
      lastSeenAt: row.lastSeenAt,
      now,
    });
    const h = hoursAgo(row.lastSeenAt, now);
    const labelParts = [
      row.model || row.brand || 'Device',
      row.androidVersion ? `Android ${row.androidVersion}` : '',
    ].filter(Boolean);
    return {
      id: row.id,
      deviceId: row.installId,
      label: labelParts.join(' · '),
      brand: row.brand,
      model: row.model,
      androidVersion: row.androidVersion,
      appVersion: row.appVersion,
      appVersionCode: row.appVersionCode,
      fcmTokenMasked: row.hasFcmToken
        ? row.fcmTokenHint || 'fcm_…****'
        : '—',
      hasFcmToken: row.hasFcmToken,
      status,
      lastSeenLabel: formatLastSeen(h),
      lastSeenHoursAgo: Math.round(h * 10) / 10,
      pushEnabled: row.pushEnabled && row.hasFcmToken && !row.blocked,
      coinBalance: row.user?.coins ?? 0,
      note: row.note,
    };
  }

  async heartbeat(userId: string, dto: DeviceHeartbeatDto) {
    const installId = assertInstallId(dto.installId);
    const brand = sanitizeDeviceText(dto.brand ?? '', 40);
    const model = sanitizeDeviceText(dto.model ?? '', 60);
    const androidVersion = sanitizeDeviceText(dto.androidVersion ?? '', 20);
    const appVersion = sanitizeDeviceText(dto.appVersion ?? '', 32);
    const appVersionCode = Math.max(0, Math.min(999999, dto.appVersionCode ?? 0));
    assertSafeDeviceText(brand || 'ok', 'Brand');
    assertSafeDeviceText(model || 'ok', 'Model');
    assertSafeDeviceText(androidVersion || 'ok', 'Android version');
    assertSafeDeviceText(appVersion || 'ok', 'App version');

    const existing = await this.prisma.deviceInstall.findUnique({
      where: { installId },
    });
    // Install ids are device-bound — another account cannot steal the row.
    if (existing?.userId && existing.userId !== userId) {
      throw new AppError(
        'DEVICE_OWNED',
        'This install is already linked to another account.',
        403,
      );
    }

    // FCM presence comes from Nest push tokens only — never trust client flags/hints.
    const pushTok = await this.prisma.devicePushToken.findFirst({
      where: {
        userId,
        pushEnabled: true,
        OR: [{ installId }, { installId: null }],
      },
      orderBy: { lastSeenAt: 'desc' },
    });
    let hasFcmToken = false;
    let fcmTokenHint = '';
    if (pushTok) {
      fcmTokenHint = maskFcmToken(pushTok.token);
      hasFcmToken = true;
      if (!pushTok.installId) {
        await this.prisma.devicePushToken.update({
          where: { id: pushTok.id },
          data: { installId },
        });
      }
    }

    if (existing?.blocked) {
      // Still refresh lastSeen for audit, but keep blocked + ownership.
      await this.prisma.deviceInstall.update({
        where: { installId },
        data: {
          userId,
          brand: brand || existing.brand,
          model: model || existing.model,
          androidVersion: androidVersion || existing.androidVersion,
          appVersion: appVersion || existing.appVersion,
          appVersionCode: appVersionCode || existing.appVersionCode,
          uninstallSuspectedAt: null,
          lastSeenAt: new Date(),
        },
      });
      return {
        ok: true,
        blocked: true,
        message: 'This device is blocked by ops.',
      };
    }

    await this.prisma.deviceInstall.upsert({
      where: { installId },
      create: {
        installId,
        userId,
        brand,
        model,
        androidVersion,
        appVersion,
        appVersionCode,
        fcmTokenHint,
        hasFcmToken,
        pushEnabled: hasFcmToken,
        uninstallSuspectedAt: null,
        lastSeenAt: new Date(),
      },
      update: {
        userId,
        brand: brand || undefined,
        model: model || undefined,
        androidVersion: androidVersion || undefined,
        appVersion: appVersion || undefined,
        appVersionCode,
        fcmTokenHint,
        hasFcmToken,
        pushEnabled: hasFcmToken,
        uninstallSuspectedAt: null,
        lastSeenAt: new Date(),
      },
    });

    this.analytics.trackSafe({
      name: 'home_open',
      userId,
      installId,
    });

    return { ok: true, blocked: false };
  }

  async adminList() {
    const rows = await this.prisma.deviceInstall.findMany({
      orderBy: { lastSeenAt: 'desc' },
      take: 500,
      include: { user: { select: { coins: true } } },
    });
    const now = new Date();
    return { devices: rows.map((r) => this.toRow(r, now)) };
  }

  private assertCanMutate(admin: AuthAdmin) {
    if (admin.role === AdminRole.VIEWER) {
      throw new AppError(
        'FORBIDDEN_ROLE',
        'Viewers cannot change device registry.',
        403,
      );
    }
  }

  private async loadOrThrow(id: string) {
    const row = await this.prisma.deviceInstall.findUnique({
      where: { id },
      include: { user: { select: { coins: true } } },
    });
    if (!row) {
      throw new AppError('DEVICE_NOT_FOUND', 'Device not found.', 404);
    }
    return row;
  }

  async adminBlock(admin: AuthAdmin, id: string) {
    this.assertCanMutate(admin);
    id = sanitizeDeviceText(id, 40);
    if (!/^[a-z0-9_-]{8,40}$/i.test(id)) {
      throw new AppError('DEVICE_BAD_ID', 'Invalid device id.', 400);
    }
    const row = await this.loadOrThrow(id);
    const note = sanitizeDeviceText(
      `${row.note} · Blocked by staff.`.trim(),
      400,
    );
    const updated = await this.prisma.deviceInstall.update({
      where: { id },
      data: {
        blocked: true,
        pushEnabled: false,
        note,
      },
      include: { user: { select: { coins: true } } },
    });
    if (updated.installId) {
      await this.prisma.devicePushToken.updateMany({
        where: { installId: updated.installId },
        data: { pushEnabled: false },
      });
    }
    await this.prisma.auditLog.create({
      data: {
        actorAdminId: admin.id,
        action: 'devices.block',
        entity: 'device_install',
        afterJson: { id, installId: updated.installId },
      },
    });
    return { device: this.toRow(updated) };
  }

  async adminUnblock(admin: AuthAdmin, id: string) {
    this.assertCanMutate(admin);
    id = sanitizeDeviceText(id, 40);
    if (!/^[a-z0-9_-]{8,40}$/i.test(id)) {
      throw new AppError('DEVICE_BAD_ID', 'Invalid device id.', 400);
    }
    const row = await this.loadOrThrow(id);
    const updated = await this.prisma.deviceInstall.update({
      where: { id },
      data: {
        blocked: false,
        pushEnabled: row.hasFcmToken,
        note: 'Unblocked by staff. Push restored if token present.',
      },
      include: { user: { select: { coins: true } } },
    });
    if (updated.hasFcmToken && updated.installId) {
      await this.prisma.devicePushToken.updateMany({
        where: { installId: updated.installId },
        data: { pushEnabled: true },
      });
    }
    await this.prisma.auditLog.create({
      data: {
        actorAdminId: admin.id,
        action: 'devices.unblock',
        entity: 'device_install',
        afterJson: { id, installId: updated.installId },
      },
    });
    return { device: this.toRow(updated) };
  }

  async adminInvalidateToken(admin: AuthAdmin, id: string) {
    this.assertCanMutate(admin);
    id = sanitizeDeviceText(id, 40);
    if (!/^[a-z0-9_-]{8,40}$/i.test(id)) {
      throw new AppError('DEVICE_BAD_ID', 'Invalid device id.', 400);
    }
    const row = await this.loadOrThrow(id);
    if (!row.hasFcmToken) {
      throw new AppError('DEVICE_NO_TOKEN', 'No FCM token on this device.', 400);
    }
    await this.prisma.devicePushToken.updateMany({
      where: { installId: row.installId },
      data: { pushEnabled: false },
    });
    const updated = await this.prisma.deviceInstall.update({
      where: { id },
      data: {
        hasFcmToken: false,
        fcmTokenHint: '',
        pushEnabled: false,
        note: sanitizeDeviceText(
          `${row.note} · FCM token invalidated by staff.`.trim(),
          400,
        ),
      },
      include: { user: { select: { coins: true } } },
    });
    await this.prisma.auditLog.create({
      data: {
        actorAdminId: admin.id,
        action: 'devices.invalidate_token',
        entity: 'device_install',
        afterJson: { id, installId: updated.installId },
      },
    });
    return { device: this.toRow(updated) };
  }

  async adminPatchNote(admin: AuthAdmin, id: string, dto: PatchDeviceNoteDto) {
    this.assertCanMutate(admin);
    id = sanitizeDeviceText(id, 40);
    if (!/^[a-z0-9_-]{8,40}$/i.test(id)) {
      throw new AppError('DEVICE_BAD_ID', 'Invalid device id.', 400);
    }
    const note = sanitizeDeviceText(dto.note ?? '', 400);
    assertSafeDeviceText(note || 'ok', 'Note');
    await this.loadOrThrow(id);
    const updated = await this.prisma.deviceInstall.update({
      where: { id },
      data: { note },
      include: { user: { select: { coins: true } } },
    });
    return { device: this.toRow(updated) };
  }

  /** Used by push register — blocked / foreign installs cannot refresh FCM. */
  async assertInstallAllowed(userId: string, installIdRaw?: string) {
    if (!installIdRaw) return;
    const installId = assertInstallId(installIdRaw);
    const row = await this.prisma.deviceInstall.findUnique({
      where: { installId },
    });
    if (row?.blocked) {
      throw new AppError(
        'DEVICE_BLOCKED',
        'This device is blocked by ops.',
        403,
      );
    }
    if (row?.userId && row.userId !== userId) {
      throw new AppError(
        'DEVICE_OWNED',
        'This install is already linked to another account.',
        403,
      );
    }
  }

  /** Push token refresh: block only banned devices. Account switch on the same phone is allowed. */
  async assertInstallNotBlocked(installIdRaw: string) {
    const installId = assertInstallId(installIdRaw);
    const row = await this.prisma.deviceInstall.findUnique({
      where: { installId },
      select: { blocked: true },
    });
    if (row?.blocked) {
      throw new AppError(
        'DEVICE_BLOCKED',
        'This device is blocked by ops.',
        403,
      );
    }
  }

  /** Filter push fan-out: drop tokens tied to blocked installs. */
  async filterEnabledTokens<
    T extends { userId: string; installId?: string | null; token: string },
  >(rows: T[]): Promise<T[]> {
    if (rows.length === 0) return rows;
    const installIds = [
      ...new Set(rows.map((r) => r.installId).filter(Boolean) as string[]),
    ];
    if (installIds.length === 0) return rows;
    const blocked = await this.prisma.deviceInstall.findMany({
      where: { blocked: true, installId: { in: installIds } },
      select: { installId: true },
    });
    if (blocked.length === 0) return rows;
    const blockedInstalls = new Set(blocked.map((b) => b.installId));
    return rows.filter(
      (r) => !r.installId || !blockedInstalls.has(r.installId),
    );
  }
}
// --- End: Devices live wire (Sachin) ---
