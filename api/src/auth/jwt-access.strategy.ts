import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import { ACCESS_COOKIE } from './auth-cookies';

export type AccessJwtPayload = {
  sub: string;
  email: string;
  role: string;
};

function accessTokenFromRequest(req: Request): string | null {
  const fromHeader = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (fromHeader) return fromHeader;
  const cookie = req?.cookies?.[ACCESS_COOKIE];
  return typeof cookie === 'string' && cookie.length > 0 ? cookie : null;
}

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: accessTokenFromRequest,
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: AccessJwtPayload) {
    const admin = await this.prisma.admin.findUnique({
      where: { id: payload.sub },
    });
    if (!admin || !admin.isActive) {
      throw new AppError('AUTH_INVALID', 'Invalid or inactive account.', 401);
    }
    return {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      allowedModules: admin.allowedModules,
      mustChangePassword: admin.mustChangePassword,
    };
  }
}
