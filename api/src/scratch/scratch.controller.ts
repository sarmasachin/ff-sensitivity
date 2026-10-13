import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserJwtAuthGuard } from '../user-auth/user-jwt-auth.guard';
import { CurrentUser } from '../user-auth/current-user.decorator';
import type { AuthUser } from '../user-auth/current-user.decorator';
import { ScratchUserService } from './scratch-user.service';

@Controller('api/v1/scratch')
@UseGuards(UserJwtAuthGuard)
export class ScratchController {
  constructor(private readonly scratch: ScratchUserService) {}

  @Get('config')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  config(@CurrentUser() user: AuthUser) {
    return this.scratch.userConfig(user.id);
  }

  @Get('history')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  history(@CurrentUser() user: AuthUser) {
    return this.scratch.history(user.id);
  }

  @Post('roll')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  roll(@CurrentUser() user: AuthUser) {
    return this.scratch.userRoll(user.id);
  }
}
