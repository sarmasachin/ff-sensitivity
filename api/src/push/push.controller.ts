import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserJwtAuthGuard } from '../user-auth/user-jwt-auth.guard';
import { CurrentUser } from '../user-auth/current-user.decorator';
import type { AuthUser } from '../user-auth/current-user.decorator';
import { PushService } from './push.service';
import { RegisterPushDeviceDto } from './dto/push.dto';

// --- Start: Push live wire (Sachin) ---
@Controller('api/v1/push')
@UseGuards(UserJwtAuthGuard)
export class PushController {
  constructor(private readonly push: PushService) {}

  @Post('device')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  register(
    @CurrentUser() user: AuthUser,
    @Body() dto: RegisterPushDeviceDto,
  ) {
    return this.push.registerDevice(user.id, dto);
  }

  @Get('inbox')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  inbox(@CurrentUser() user: AuthUser) {
    return this.push.inbox(user.id);
  }
}
// --- End: Push live wire (Sachin) ---
