import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AdminRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import { AppError } from '../common/errors/app-error';
import { SettingsModuleGuard } from './settings-module.guard';
import { SettingsService } from './settings.service';
import { SaveOpsSettingsDto } from './dto/settings.dto';

// --- Start: Ops settings live wire (Sachin) ---
@Controller('api/v1/admin/settings')
@UseGuards(JwtAuthGuard, SettingsModuleGuard)
export class SettingsAdminController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  get() {
    return this.settings.adminGet();
  }

  @Put()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  save(@CurrentAdmin() admin: AuthAdmin, @Body() dto: SaveOpsSettingsDto) {
    if (admin.role === AdminRole.VIEWER) {
      throw new AppError(
        'FORBIDDEN_ROLE',
        'Viewers cannot change Settings.',
        403,
      );
    }
    return this.settings.adminSave(admin.id, dto);
  }

  /** Purge AuditLog rows older than configured retention (not wipe-all). */
  @Post('audit-purge')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  purgeAudit(@CurrentAdmin() admin: AuthAdmin) {
    if (admin.role === AdminRole.VIEWER) {
      throw new AppError(
        'FORBIDDEN_ROLE',
        'Viewers cannot purge audit logs.',
        403,
      );
    }
    return this.settings.purgeAuditLogs(admin.id, { manual: true });
  }
}
// --- End: Ops settings live wire (Sachin) ---
