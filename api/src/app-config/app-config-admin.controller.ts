import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AdminRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import { AppError } from '../common/errors/app-error';
import { AppConfigModuleGuard } from './app-config-module.guard';
import { AppConfigService } from './app-config.service';
import { SaveAppConfigDto } from './dto/app-config.dto';

// --- Start: App remote config live wire (Sachin) ---
@Controller('api/v1/admin/app')
@UseGuards(JwtAuthGuard, AppConfigModuleGuard)
export class AppConfigAdminController {
  constructor(private readonly appConfig: AppConfigService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  get() {
    return this.appConfig.adminGet();
  }

  @Put()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  save(@CurrentAdmin() admin: AuthAdmin, @Body() dto: SaveAppConfigDto) {
    // Live kill-switches / maintenance — viewers read-only
    if (admin.role === AdminRole.VIEWER) {
      throw new AppError(
        'FORBIDDEN_ROLE',
        'Viewers cannot change App remote config.',
        403,
      );
    }
    return this.appConfig.adminSave(admin.id, dto);
  }
}
// --- End: App remote config live wire (Sachin) ---
