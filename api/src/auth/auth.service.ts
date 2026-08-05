import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import { SettingsService } from '../settings/settings.service';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  assertPhone,
  assertSafeProfileText,
  sanitizeProfileText,
  toProfileView,
} from './auth-profile';

const LOCK_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;
const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly fails = new Map<string, { count: number; until: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Optional() private readonly settings?: SettingsService,
  ) {}

  async login(dto: LoginDto, ip?: string) {
    const email = dto.email.trim().toLowerCase();
    this.assertNotLocked(email);

    const admin = await this.prisma.admin.findUnique({ where: { email } });
    const ok =
      !!admin &&
      admin.isActive &&
      (await bcrypt.compare(dto.password, admin.passwordHash));

    if (!ok || !admin) {
      this.recordFail(email);
      throw new AppError('AUTH_INVALID', 'Invalid email or password.', 401);
    }

    this.fails.delete(email);

    const ttl = this.config.get<string>('JWT_ACCESS_TTL') ?? '15m';
    const accessToken = await this.jwt.signAsync(
      { sub: admin.id, email: admin.email, role: admin.role },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: ttl as `${number}m` | `${number}s` | `${number}h` | `${number}d`,
      },
    );

    const refreshRaw = randomBytes(48).toString('hex');
    const refreshHash = this.hashToken(refreshRaw);

    let rememberDays = Number(this.config.get('JWT_REFRESH_TTL_DAYS') ?? 14);
    let singleSessionOnly = false;
    try {
      if (this.settings) {
        const policy = await this.settings.getBundle();
        rememberDays = policy.session.rememberDeviceDays;
        singleSessionOnly = policy.session.singleSessionOnly;
      }
    } catch {
      // Settings table may be mid-migrate — fall back to env defaults.
    }

    if (singleSessionOnly) {
      await this.prisma.adminSession.deleteMany({
        where: { adminId: admin.id },
      });
    }

    const expiresAt = new Date(
      Date.now() + Math.max(0, rememberDays) * 24 * 60 * 60 * 1000,
    );

    await this.prisma.adminSession.create({
      data: {
        adminId: admin.id,
        refreshTokenHash: refreshHash,
        ip: ip ?? null,
        expiresAt,
      },
    });

    await this.prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        actorAdminId: admin.id,
        action: 'auth.login',
        entity: 'admin',
        afterJson: { email: admin.email, ip: ip ?? null, singleSessionOnly },
      },
    });

    const profile = toProfileView(admin);
    return {
      accessToken,
      refreshToken: refreshRaw,
      admin: {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        allowedModules: profile.allowedModules,
        mustChangePassword: profile.mustChangePassword,
        displayName: profile.displayName,
      },
    };
  }

  async me(adminId: string) {
    const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin || !admin.isActive) {
      throw new AppError('AUTH_INVALID', 'Invalid or inactive account.', 401);
    }
    return toProfileView(admin);
  }

  // --- Start: Admin profile live wire (Sachin) ---
  async updateProfile(adminId: string, dto: UpdateProfileDto) {
    const admin = await this.requireActiveAdmin(adminId);

    const displayName = sanitizeProfileText(dto.displayName, 64);
    const jobTitle = sanitizeProfileText(dto.jobTitle, 64);
    const deskLabel = sanitizeProfileText(dto.deskLabel, 64);
    const notifyEmail = sanitizeProfileText(dto.notifyEmail, 120).toLowerCase();
    const phone = sanitizeProfileText(dto.phone ?? '', 32);
    const timezoneLabel = sanitizeProfileText(dto.timezoneLabel, 64);

    if (displayName.length < 2) {
      throw new AppError('PROFILE_BAD_NAME', 'Display name is required.', 400);
    }
    if (jobTitle.length < 2) {
      throw new AppError('PROFILE_BAD_TITLE', 'Job title is required.', 400);
    }
    if (deskLabel.length < 2) {
      throw new AppError('PROFILE_BAD_DESK', 'Desk label is required.', 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyEmail)) {
      throw new AppError(
        'PROFILE_BAD_EMAIL',
        'Notify email looks invalid.',
        400,
      );
    }
    if (timezoneLabel.length < 2) {
      throw new AppError(
        'PROFILE_BAD_TZ',
        'Timezone label is required.',
        400,
      );
    }
    assertPhone(phone);
    assertSafeProfileText(displayName, 'Display name');
    assertSafeProfileText(jobTitle, 'Job title');
    assertSafeProfileText(deskLabel, 'Desk label');
    assertSafeProfileText(timezoneLabel, 'Timezone');

    const updated = await this.prisma.admin.update({
      where: { id: admin.id },
      data: {
        displayName,
        jobTitle,
        deskLabel,
        notifyEmail,
        phone: phone || null,
        timezoneLabel,
        digestDaily: Boolean(dto.digestDaily),
        digestSecurity: Boolean(dto.digestSecurity),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorAdminId: admin.id,
        action: 'auth.profile_update',
        entity: 'admin',
        beforeJson: {
          displayName: admin.displayName,
          jobTitle: admin.jobTitle,
          deskLabel: admin.deskLabel,
          notifyEmail: admin.notifyEmail,
          phone: admin.phone,
          timezoneLabel: admin.timezoneLabel,
          digestDaily: admin.digestDaily,
          digestSecurity: admin.digestSecurity,
        },
        afterJson: {
          displayName,
          jobTitle,
          deskLabel,
          notifyEmail,
          phone: phone || null,
          timezoneLabel,
          digestDaily: Boolean(dto.digestDaily),
          digestSecurity: Boolean(dto.digestSecurity),
        },
      },
    });

    return toProfileView(updated);
  }

  async changePassword(adminId: string, dto: ChangePasswordDto) {
    const lockKey = `pwd:${adminId}`;
    this.assertNotLocked(lockKey);

    const admin = await this.requireActiveAdmin(adminId);
    const currentOk = await bcrypt.compare(
      dto.currentPassword,
      admin.passwordHash,
    );
    if (!currentOk) {
      this.recordFail(lockKey);
      throw new AppError(
        'AUTH_BAD_PASSWORD',
        'Current password is incorrect.',
        400,
      );
    }

    const next = dto.newPassword;
    if (next.length < 8 || next.length > 128) {
      throw new AppError(
        'AUTH_WEAK_PASSWORD',
        'New password must be 8–128 characters.',
        400,
      );
    }
    if (next === dto.currentPassword) {
      throw new AppError(
        'AUTH_SAME_PASSWORD',
        'New password must differ from the current one.',
        400,
      );
    }
    if (/\s/.test(next)) {
      throw new AppError(
        'AUTH_WEAK_PASSWORD',
        'Password must not contain spaces.',
        400,
      );
    }

    const passwordHash = await bcrypt.hash(next, BCRYPT_ROUNDS);
    const updated = await this.prisma.admin.update({
      where: { id: admin.id },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    // Invalidate refresh sessions so stolen cookies cannot linger.
    await this.prisma.adminSession.updateMany({
      where: { adminId: admin.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    this.fails.delete(lockKey);

    await this.prisma.auditLog.create({
      data: {
        actorAdminId: admin.id,
        action: 'auth.password_change',
        entity: 'admin',
        afterJson: { mustChangePassword: false, sessionsRevoked: true },
      },
    });

    return toProfileView(updated);
  }
  // --- End: Admin profile live wire (Sachin) ---

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return { ok: true };
    const hash = this.hashToken(refreshToken);
    await this.prisma.adminSession.updateMany({
      where: { refreshTokenHash: hash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  private async requireActiveAdmin(adminId: string) {
    const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin || !admin.isActive) {
      throw new AppError('AUTH_INVALID', 'Invalid or inactive account.', 401);
    }
    return admin;
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private assertNotLocked(email: string) {
    const row = this.fails.get(email);
    if (!row) return;
    if (Date.now() < row.until && row.count >= MAX_FAILS) {
      throw new AppError(
        'AUTH_LOCKED',
        'Too many failed attempts. Try again later.',
        429,
      );
    }
    if (Date.now() >= row.until) this.fails.delete(email);
  }

  private recordFail(email: string) {
    const now = Date.now();
    const row = this.fails.get(email);
    if (!row || now >= row.until) {
      this.fails.set(email, { count: 1, until: now + LOCK_WINDOW_MS });
      return;
    }
    row.count += 1;
    if (row.count >= MAX_FAILS) row.until = now + LOCK_WINDOW_MS;
  }
}
