import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';

// --- Start: Redeem live wire (Sachin) ---
export type UserJwtPayload = {
  sub: string;
  email: string;
  aud: 'user';
  /** Token version — must match User.tokenVersion or JWT is revoked. */
  tv?: number;
};

@Injectable()
export class UserJwtStrategy extends PassportStrategy(Strategy, 'user-jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_USER_SECRET'),
    });
  }

  async validate(payload: UserJwtPayload) {
    if (payload.aud !== 'user') {
      throw new AppError('AUTH_INVALID', 'Invalid token audience.', 401);
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        displayName: true,
        isActive: true,
        tokenVersion: true,
      },
    });
    if (!user || !user.isActive) {
      throw new AppError('AUTH_INVALID', 'Invalid or inactive account.', 401);
    }
    const tv = typeof payload.tv === 'number' ? payload.tv : 0;
    if (tv !== user.tokenVersion) {
      throw new AppError('AUTH_REVOKED', 'Session ended. Sign in again.', 401);
    }
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    };
  }
}
// --- End: Redeem live wire (Sachin) ---
