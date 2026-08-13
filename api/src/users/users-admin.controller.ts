import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import { UsersModuleGuard } from './users-module.guard';
import { UsersService } from './users.service';
import { UsersScreenJourneyService } from './users-screen-journey.service';
import { UsersActivityFeedService } from './users-activity-feed.service';
import { UserNoteDto, UserStatusDto } from './dto/users.dto';

// --- Start: Users admin live wire (Sachin) ---
@Controller('api/v1/admin/users')
@UseGuards(JwtAuthGuard, UsersModuleGuard)
export class UsersAdminController {
  constructor(
    private readonly users: UsersService,
    private readonly screenJourney: UsersScreenJourneyService,
    private readonly activityFeed: UsersActivityFeedService,
  ) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  list() {
    return this.users.adminListUsers();
  }

  @Get(':userId/screen-journey')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  screenJourneyForUser(
    @Param('userId') userId: string,
    @Query('days') days?: string,
  ) {
    return this.screenJourney.forUser(userId, days);
  }

  @Get(':userId/activity-feed')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  activityFeedForUser(
    @Param('userId') userId: string,
    @Query('days') days?: string,
  ) {
    return this.activityFeed.forUser(userId, days);
  }

  @Post(':userId/status')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  setStatus(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('userId') userId: string,
    @Body() dto: UserStatusDto,
  ) {
    return this.users.adminSetStatus(admin, userId, dto);
  }

  @Post(':userId/note')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  setNote(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('userId') userId: string,
    @Body() dto: UserNoteDto,
  ) {
    return this.users.adminSetNote(admin, userId, dto);
  }
}
// --- End: Users admin live wire (Sachin) ---
