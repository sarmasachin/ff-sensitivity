import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AdminRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import { AppError } from '../common/errors/app-error';
import { AppConfigModuleGuard } from './app-config-module.guard';
import { AppConfigService } from './app-config.service';
import { SaveAdsConfigDto } from './dto/ads-config.dto';

@Controller('api/v1/admin/ads')
@UseGuards(JwtAuthGuard, AppConfigModuleGuard)
export class AppConfigAdsAdminController {
  constructor(private readonly appConfig: AppConfigService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  get() {
    return this.appConfig.adminGetAds();
  }

  @Put()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  save(@CurrentAdmin() admin: AuthAdmin, @Body() dto: SaveAdsConfigDto) {
    if (admin.role === AdminRole.VIEWER) {
      throw new AppError(
        'FORBIDDEN_ROLE',
        'Viewers cannot change Ads config.',
        403,
      );
    }
    return this.appConfig.adminSaveAds(admin.id, dto);
  }
}
