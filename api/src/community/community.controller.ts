import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserJwtAuthGuard } from '../user-auth/user-jwt-auth.guard';
import { CurrentUser } from '../user-auth/current-user.decorator';
import type { AuthUser } from '../user-auth/current-user.decorator';
import { AppError } from '../common/errors/app-error';
import { CommunityService } from './community.service';
import { SubmitCommunityPostDto } from './dto/community.dto';

// --- Start: Community live wire (Sachin) ---
@Controller('api/v1/community')
@UseGuards(UserJwtAuthGuard)
export class CommunityController {
  constructor(private readonly community: CommunityService) {}

  @Get('feed')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  feed() {
    return this.community.feed();
  }

  @Post('posts')
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  submit(@CurrentUser() user: AuthUser, @Body() dto: SubmitCommunityPostDto) {
    return this.community.submit(user.id, dto);
  }

  @Post('posts/:id/report')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  report(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    if (!id?.trim() || id.includes('/') || id.length > 64) {
      throw new AppError('COMMUNITY_BAD_ID', 'Invalid post id.', 400);
    }
    return this.community.report(user.id, id.trim());
  }
}
// --- End: Community live wire (Sachin) ---
