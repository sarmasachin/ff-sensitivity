import { Controller, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AppConfigService } from './app-config.service';

// --- Start: App remote config live wire (Sachin) ---
@Controller('api/v1/app')
export class AppConfigController {
  constructor(private readonly appConfig: AppConfigService) {}

  @Get('config')
  @Throttle({ default: { limit: 90, ttl: 60_000 } })
  live() {
    return this.appConfig.publicLive();
  }
}
// --- End: App remote config live wire (Sachin) ---
