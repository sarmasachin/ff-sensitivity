import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserJwtAuthGuard } from '../user-auth/user-jwt-auth.guard';
import {
  CurrentUser,
  type AuthUser,
} from '../user-auth/current-user.decorator';
import { AnalyticsService } from './analytics.service';
import { AnonOpenDto, TrackAnalyticsEventDto } from './dto/analytics.dto';

// --- Start: App analytics P1 live wire (Sachin) ---
@Controller('api/v1/analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  /** Signed-in open pings (app_open, home_open). */
  @Post('events')
  @UseGuards(UserJwtAuthGuard)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  track(
    @CurrentUser() user: AuthUser,
    @Body() dto: TrackAnalyticsEventDto,
  ) {
    return this.analytics.trackFromUser(user.id, dto);
  }

  /** Pre-login open ping — installId only, no PII. */
  @Post('anon-open')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  anonOpen(@Body() dto: AnonOpenDto) {
    return this.analytics.trackAnonOpen(dto.installId, dto.appVersion);
  }
}
// --- End: App analytics P1 live wire (Sachin) ---
