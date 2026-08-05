import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserJwtAuthGuard } from '../user-auth/user-jwt-auth.guard';
import { CurrentUser } from '../user-auth/current-user.decorator';
import type { AuthUser } from '../user-auth/current-user.decorator';
import { DevicesService } from './devices.service';
import { DeviceHeartbeatDto } from './dto/devices.dto';

// --- Start: Devices live wire (Sachin) ---
@Controller('api/v1/devices')
@UseGuards(UserJwtAuthGuard)
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Post('heartbeat')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  heartbeat(@CurrentUser() user: AuthUser, @Body() dto: DeviceHeartbeatDto) {
    return this.devices.heartbeat(user.id, dto);
  }
}
// --- End: Devices live wire (Sachin) ---
