import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserJwtAuthGuard } from '../user-auth/user-jwt-auth.guard';
import { CurrentUser } from '../user-auth/current-user.decorator';
import type { AuthUser } from '../user-auth/current-user.decorator';
import { ScratchService } from './scratch.service';

// --- Start: Scratch live wire (Sachin) ---
@Controller('api/v1/scratch')
@UseGuards(UserJwtAuthGuard)
export class ScratchController {
  constructor(private readonly scratch: ScratchService) {}

  @Get('config')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  config(@CurrentUser() user: AuthUser) {
    return this.scratch.userConfig(user.id);
  }

  @Post('roll')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  roll(@CurrentUser() user: AuthUser) {
    return this.scratch.userRoll(user.id);
  }
}
// --- End: Scratch live wire (Sachin) ---
