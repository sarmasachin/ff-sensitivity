import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import { AppError } from '../common/errors/app-error';
import { SupportModuleGuard } from './support-module.guard';
import { SupportService } from './support.service';
import { AdminSupportReplyDto } from './dto/support.dto';

// --- Start: Support live wire (Sachin) ---
@Controller('api/v1/admin/support')
@UseGuards(JwtAuthGuard, SupportModuleGuard)
export class SupportAdminController {
  constructor(private readonly support: SupportService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  list(@Query('q') q?: string, @Query('status') status?: string) {
    return this.support.adminList(q, status);
  }

  @Get('stats')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  stats() {
    return this.support.adminStats();
  }

  @Post(':id/reply')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  reply(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('id') id: string,
    @Body() dto: AdminSupportReplyDto,
  ) {
    if (!id?.trim() || id.includes('/') || id.length > 64) {
      throw new AppError('SUPPORT_BAD_ID', 'Invalid thread id.', 400);
    }
    return this.support.adminReply(admin.id, id.trim(), dto);
  }

  @Patch(':id/close')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  close(@CurrentAdmin() admin: AuthAdmin, @Param('id') id: string) {
    if (!id?.trim() || id.includes('/') || id.length > 64) {
      throw new AppError('SUPPORT_BAD_ID', 'Invalid thread id.', 400);
    }
    return this.support.adminClose(admin.id, id.trim());
  }

  @Patch(':id/read')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  markRead(@CurrentAdmin() admin: AuthAdmin, @Param('id') id: string) {
    if (!id?.trim() || id.includes('/') || id.length > 64) {
      throw new AppError('SUPPORT_BAD_ID', 'Invalid thread id.', 400);
    }
    return this.support.adminMarkRead(admin.id, id.trim());
  }
}
// --- End: Support live wire (Sachin) ---
