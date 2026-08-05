import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserJwtAuthGuard } from '../user-auth/user-jwt-auth.guard';
import { CurrentUser } from '../user-auth/current-user.decorator';
import type { AuthUser } from '../user-auth/current-user.decorator';
import { AppError } from '../common/errors/app-error';
import { SupportService } from './support.service';
import {
  StartSupportThreadDto,
  SupportMessageDto,
} from './dto/support.dto';

// --- Start: Support live wire (Sachin) ---
@Controller('api/v1/support')
@UseGuards(UserJwtAuthGuard)
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Get('thread')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  mine(@CurrentUser() user: AuthUser) {
    return this.support.userGetMine(user.id);
  }

  @Post('thread')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  start(@CurrentUser() user: AuthUser, @Body() dto: StartSupportThreadDto) {
    return this.support.userStart(user.id, dto);
  }

  @Post('thread/:id/messages')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  reply(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SupportMessageDto,
  ) {
    if (!id?.trim() || id.includes('/') || id.length > 64) {
      throw new AppError('SUPPORT_BAD_ID', 'Invalid thread id.', 400);
    }
    return this.support.userReply(user.id, id.trim(), dto);
  }
}
// --- End: Support live wire (Sachin) ---
