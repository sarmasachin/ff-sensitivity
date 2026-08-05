import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import {
  DEFAULT_OPS_SETTINGS,
  mergeSettingsJson,
  normalizeSettingsPayload,
  type OpsSettingsBundle,
} from './settings-security';

// --- Start: Ops settings live wire (Sachin) ---
const CONFIG_ID = 1;
const PURGE_INTERVAL_MS = 60 * 60 * 1000;

export type StepUpKind = 'reveal' | 'staff' | 'wallet';

@Injectable()
export class SettingsService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(SettingsService.name);
  private purgeTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.purgeTimer = setInterval(() => {
      void this.purgeAuditLogs(null, { manual: false }).catch((err) => {
        this.log.warn(`Audit auto-purge failed: ${String(err)}`);
      });
    }, PURGE_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.purgeTimer) clearInterval(this.purgeTimer);
    this.purgeTimer = null;
  }

  async ensureDefaults() {
    const existing = await this.prisma.opsSettings.findUnique({
      where: { id: CONFIG_ID },
    });
    if (existing) return existing;
    const d = DEFAULT_OPS_SETTINGS;
    try {
      return await this.prisma.opsSettings.create({
        data: {
          id: CONFIG_ID,
          preferences: d.preferences as Prisma.InputJsonValue,
          session: d.session as Prisma.InputJsonValue,
          security: d.security as Prisma.InputJsonValue,
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        const again = await this.prisma.opsSettings.findUnique({
          where: { id: CONFIG_ID },
        });
        if (again) return again;
      }
      throw e;
    }
  }

  async getBundle(): Promise<OpsSettingsBundle> {
    const row = await this.ensureDefaults();
    return mergeSettingsJson(row.preferences, row.session, row.security);
  }

  async adminGet() {
    return this.getBundle();
  }

  async adminSave(actorAdminId: string, raw: unknown) {
    const prev = await this.getBundle();
    const bundle = normalizeSettingsPayload(raw);
    // Server-owned stamp — clients cannot clear / forge purge history.
    bundle.security.lastAuditPurgeAt = prev.security.lastAuditPurgeAt;
    await this.ensureDefaults();
    await this.prisma.$transaction(async (tx) => {
      await tx.opsSettings.update({
        where: { id: CONFIG_ID },
        data: {
          preferences: bundle.preferences as Prisma.InputJsonValue,
          session: bundle.session as Prisma.InputJsonValue,
          security: bundle.security as Prisma.InputJsonValue,
        },
      });
      await tx.auditLog.create({
        data: {
          actorAdminId,
          action: 'settings.config_save',
          entity: 'ops_settings',
          afterJson: {
            landing: bundle.preferences.defaultLanding,
            idleMinutes: bundle.session.idleTimeoutMinutes,
            sessionHours: bundle.session.absoluteSessionHours,
            singleSession: bundle.session.singleSessionOnly,
            reauthReveal: bundle.security.requireReauthForReveal,
            reauthStaff: bundle.security.requireReauthForStaffInvite,
            reauthWallet: bundle.security.requireReauthForWalletAdjust,
            viewerCsv: bundle.security.allowViewerCsvExport,
            auditRetentionDays: bundle.security.auditRetentionDays,
            auditAutoPurge: bundle.security.auditAutoPurge,
          },
        },
      });
    });
    return bundle;
  }

  /**
   * Deletes AuditLog rows older than retention.
   * manual=true → admin Run now (ignores autoPurge off).
   * manual=false → hourly job (respects autoPurge).
   */
  async purgeAuditLogs(
    actorAdminId: string | null,
    opts: { manual: boolean },
  ) {
    const bundle = await this.getBundle();
    if (!opts.manual && !bundle.security.auditAutoPurge) {
      return {
        deleted: 0,
        skipped: true as const,
        retentionDays: bundle.security.auditRetentionDays,
        lastAuditPurgeAt: bundle.security.lastAuditPurgeAt,
      };
    }
    const days = bundle.security.auditRetentionDays;
    const cutoff = new Date(Date.now() - days * 86_400_000);
    const result = await this.prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    const stamped = new Date().toISOString();
    const nextSecurity = {
      ...bundle.security,
      lastAuditPurgeAt: stamped,
    };
    await this.prisma.$transaction(async (tx) => {
      await tx.opsSettings.update({
        where: { id: CONFIG_ID },
        data: { security: nextSecurity as Prisma.InputJsonValue },
      });
      await tx.auditLog.create({
        data: {
          actorAdminId,
          action: 'settings.audit_purge',
          entity: 'audit_logs',
          afterJson: {
            deleted: result.count,
            retentionDays: days,
            cutoff: cutoff.toISOString(),
            manual: opts.manual,
          },
        },
      });
    });
    return {
      deleted: result.count,
      skipped: false as const,
      retentionDays: days,
      lastAuditPurgeAt: stamped,
    };
  }

  async assertStepUp(
    adminId: string,
    currentPassword: string | undefined,
    kind: StepUpKind,
  ) {
    const bundle = await this.getBundle();
    const required =
      kind === 'reveal'
        ? bundle.security.requireReauthForReveal
        : kind === 'staff'
          ? bundle.security.requireReauthForStaffInvite
          : bundle.security.requireReauthForWalletAdjust;
    if (!required) return;

    const pwd = (currentPassword ?? '').trim();
    if (pwd.length < 6 || pwd.length > 128) {
      throw new AppError(
        'REAUTH_REQUIRED',
        'Confirm your password to continue.',
        403,
      );
    }
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
      select: { passwordHash: true, isActive: true },
    });
    if (!admin?.isActive) {
      throw new AppError('AUTH_INVALID', 'Invalid or inactive account.', 401);
    }
    const ok = await bcrypt.compare(pwd, admin.passwordHash);
    if (!ok) {
      throw new AppError(
        'REAUTH_INVALID',
        'Password confirmation failed.',
        403,
      );
    }
  }
}
// --- End: Ops settings live wire (Sachin) ---
