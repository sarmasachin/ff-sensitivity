import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';

export type AccessJwtPayload = {
  sub: string;
  email: string;
  role: string;
};

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
