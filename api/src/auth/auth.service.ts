import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import { LoginDto } from './dto/login.dto';

const LOCK_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;

@Injectable()
export class AuthService {
  private readonly fails = new Map<string, { count: number; until: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
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
        // jwt typings expect ms.StringValue; env is a plain string
        expiresIn: ttl as `${number}m` | `${number}s` | `${number}h` | `${number}d`,
      },
    );

    const refreshRaw = randomBytes(48).toString('hex');
    const refreshHash = this.hashToken(refreshRaw);
    const days = Number(this.config.get('JWT_REFRESH_TTL_DAYS') ?? 14);
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

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
        afterJson: { email: admin.email, ip: ip ?? null },
      },
    });

    return {
      accessToken,
      refreshToken: refreshRaw,
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        allowedModules: admin.allowedModules,
        mustChangePassword: admin.mustChangePassword,
      },
    };
  }

  async me(adminId: string) {
    const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin || !admin.isActive) {
      throw new AppError('AUTH_INVALID', 'Invalid or inactive account.', 401);
    }
    return {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      allowedModules: admin.allowedModules,
      mustChangePassword: admin.mustChangePassword,
      lastLoginAt: admin.lastLoginAt,
    };
  }

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return { ok: true };
    const hash = this.hashToken(refreshToken);
    await this.prisma.adminSession.updateMany({
      where: { refreshTokenHash: hash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
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
