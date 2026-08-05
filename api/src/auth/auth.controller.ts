import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResendLoginOtpDto } from './dto/resend-login-otp.dto';
import { VerifyLoginOtpDto } from './dto/verify-login-otp.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Req() req: { ip?: string; headers: Record<string, string | undefined> },
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip ?? req.headers['x-forwarded-for'];
    const result = await this.auth.login(
      dto,
      typeof ip === 'string' ? ip : undefined,
    );
    if ('requiresOtp' in result) return result;
    this.setRefreshCookie(res, result.refreshToken);
    return {
      accessToken: result.accessToken,
      admin: result.admin,
    };
  }

  @Post('login/verify-otp')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async verifyLoginOtp(
    @Body() dto: VerifyLoginOtpDto,
    @Req() req: { ip?: string; headers: Record<string, string | undefined> },
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip ?? req.headers['x-forwarded-for'];
    const result = await this.auth.verifyLoginOtp(
      dto,
      typeof ip === 'string' ? ip : undefined,
    );
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, admin: result.admin };
  }

  @Post('login/resend-otp')
  @Throttle({ default: { limit: 4, ttl: 10 * 60_000 } })
  resendLoginOtp(@Body() dto: ResendLoginOtpDto) {
    return this.auth.resendLoginOtp(dto);
  }

  @Post('logout')
  async logout(
    @Req() req: { cookies?: { refresh_token?: string } },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logout(req.cookies?.refresh_token);
    res.clearCookie('refresh_token', this.cookieOpts());
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: { user: { id: string } }) {
    return this.auth.me(req.user.id);
  }

  // --- Start: Admin profile live wire (Sachin) ---
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(
    @Req() req: { user: { id: string } },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.auth.updateProfile(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('password')
  changePassword(
    @Req() req: { user: { id: string } },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(req.user.id, dto);
  }
  // --- End: Admin profile live wire (Sachin) ---

  private setRefreshCookie(res: Response, token: string) {
    const days = Number(this.config.get('JWT_REFRESH_TTL_DAYS') ?? 14);
    res.cookie('refresh_token', token, {
      ...this.cookieOpts(),
      maxAge: days * 24 * 60 * 60 * 1000,
    });
  }

  private cookieOpts() {
    const corsOrigin = this.config.get<string>('CORS_ORIGIN') ?? '';
    const secure =
      process.env.NODE_ENV === 'production' ||
      corsOrigin.startsWith('https://');
    return {
      httpOnly: true,
      secure,
      sameSite: 'strict' as const,
      path: '/api/v1/auth',
    };
  }
}
