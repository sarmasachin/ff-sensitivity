import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import { AnalyticsService } from '../analytics/analytics.service';
import { optionalInstallId } from '../analytics/analytics-security';
import { GoogleAuthDto } from './dto/google-auth.dto';

// --- Start: Redeem live wire (Sachin) ---
@Injectable()
export class UserAuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly analytics: AnalyticsService,
  ) {
    this.googleClient = new OAuth2Client(
      this.config.getOrThrow<string>('GOOGLE_WEB_CLIENT_ID'),
    );
  }

  async loginWithGoogle(dto: GoogleAuthDto) {
    const audience = this.config.getOrThrow<string>('GOOGLE_WEB_CLIENT_ID');
    let payload: {
      sub?: string;
      email?: string;
      email_verified?: boolean | string;
      name?: string;
      picture?: string;
    };
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: dto.idToken,
        audience,
      });
      payload = ticket.getPayload() ?? {};
    } catch {
      throw new AppError('AUTH_GOOGLE_INVALID', 'Google Sign-In failed.', 401);
    }

    const googleSub = payload.sub?.trim();
    const email = payload.email?.trim().toLowerCase();
    const emailVerified =
      payload.email_verified === true || payload.email_verified === 'true';
    if (!googleSub || !email || !emailVerified) {
      throw new AppError(
        'AUTH_GOOGLE_INVALID',
        'Google account email is not available.',
        401,
      );
    }

    const displayName =
      payload.name?.trim() || email.split('@')[0] || 'Google Player';
    const photoUrl = payload.picture?.trim() || null;

    // Reject suspended seats before touching lastLoginAt / profile.
    const existing = await this.prisma.user.findUnique({
      where: { googleSub },
      select: { isActive: true, dataDeletedAt: true },
    });
    if (existing && (!existing.isActive || existing.dataDeletedAt)) {
      throw new AppError('AUTH_SUSPENDED', 'This account is suspended.', 403);
    }

    // Do not force isActive:true on login — suspend must stick.
    const user = await this.prisma.user.upsert({
      where: { googleSub },
      update: {
        email,
        displayName,
        photoUrl,
        lastLoginAt: new Date(),
      },
      create: {
        googleSub,
        email,
        displayName,
        photoUrl,
        lastLoginAt: new Date(),
      },
    });

    if (!user.isActive) {
      throw new AppError('AUTH_SUSPENDED', 'This account is suspended.', 403);
    }

    // Server-owned login ping for Users drawer activity feed (not client-postable).
    this.analytics.trackSafe({
      name: 'login',
      userId: user.id,
    });

    const accessToken = await this.jwt.signAsync(
      {
        sub: user.id,
        email: user.email,
        aud: 'user',
        tv: user.tokenVersion,
      },
      {
        secret: this.config.getOrThrow<string>('JWT_USER_SECRET'),
        expiresIn: 60 * 60 * 24 * 7,
      },
    );

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        coins: user.coins,
      },
    };
  }

  // --- Start: App analytics P2 logout (Sachin) ---
  /** Bump tokenVersion so all existing JWTs for this user stop validating. */
  async logout(userId: string, installIdRaw?: string) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
      select: { id: true, tokenVersion: true },
    });
    let installId: string | null = null;
    try {
      installId = optionalInstallId(installIdRaw ?? null);
    } catch {
      installId = null;
    }
    this.analytics.trackSafe({
      name: 'logout',
      userId,
      installId,
    });
    return { ok: true as const, tokenVersion: updated.tokenVersion };
  }
  // --- End: App analytics P2 logout (Sachin) ---
}
// --- End: Redeem live wire (Sachin) ---
