import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AdminRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import { AppError } from '../common/errors/app-error';
import { CopyModuleGuard } from './copy-module.guard';
import { CopyService } from './copy.service';
import { SaveCopyConfigDto } from './dto/copy.dto';

// --- Start: Copy CMS live wire (Sachin) ---
@Controller('api/v1/admin/copy')
@UseGuards(JwtAuthGuard, CopyModuleGuard)
export class CopyAdminController {
  constructor(private readonly copy: CopyService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  get() {
    return this.copy.adminGet();
  }

  @Put()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  save(@CurrentAdmin() admin: AuthAdmin, @Body() dto: SaveCopyConfigDto) {
    if (admin.role === AdminRole.VIEWER) {
      throw new AppError(
        'FORBIDDEN_ROLE',
        'Viewers cannot change Copy.',
        403,
      );
    }
    return this.copy.adminSave(admin.id, dto);
  }
}
// --- End: Copy CMS live wire (Sachin) ---
