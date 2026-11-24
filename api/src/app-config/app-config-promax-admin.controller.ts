import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AdminRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import { AppError } from '../common/errors/app-error';
import { AppConfigModuleGuard } from './app-config-module.guard';
import { AppConfigService } from './app-config.service';
import { SaveProMaxConfigDto } from './dto/promax-config.dto';

@Controller('api/v1/admin/promax')
@UseGuards(JwtAuthGuard, AppConfigModuleGuard)
export class AppConfigProMaxAdminController {
  constructor(private readonly appConfig: AppConfigService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  get() {
    return this.appConfig.adminGetProMax();
  }

  @Put()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  save(@CurrentAdmin() admin: AuthAdmin, @Body() dto: SaveProMaxConfigDto) {
    if (admin.role === AdminRole.VIEWER) {
      throw new AppError(
        'FORBIDDEN_ROLE',
        'Viewers cannot change ProMax config.',
        403,
      );
    }
    return this.appConfig.adminSaveProMax(admin.id, dto);
  }
}
