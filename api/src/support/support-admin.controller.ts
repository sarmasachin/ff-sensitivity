import {
  Body,
  Controller,
  Delete,
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
import { SupportAdminInboxService } from './support-admin-inbox.service';
import { SupportModuleGuard } from './support-module.guard';
import { AdminSupportReplyDto } from './dto/support.dto';

function assertSupportId(id: string, label = 'thread') {
  if (!id?.trim() || id.includes('/') || id.length > 64) {
    throw new AppError('SUPPORT_BAD_ID', `Invalid ${label} id.`, 400);
  }
  return id.trim();
}

// --- Start: Support live wire (Sachin) ---
@Controller('api/v1/admin/support')
@UseGuards(JwtAuthGuard, SupportModuleGuard)
export class SupportAdminController {
  constructor(private readonly support: SupportAdminInboxService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  list(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('subject') subject?: string,
    @Query('unread') unread?: string,
  ) {
    return this.support.adminList(q, status, subject, unread);
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
    return this.support.adminReply(admin.id, assertSupportId(id), dto);
  }

  @Patch(':id/close')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  close(@CurrentAdmin() admin: AuthAdmin, @Param('id') id: string) {
    return this.support.adminClose(admin.id, assertSupportId(id));
  }

  @Patch(':id/read')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  markRead(@CurrentAdmin() admin: AuthAdmin, @Param('id') id: string) {
    return this.support.adminMarkRead(admin.id, assertSupportId(id));
  }

  @Delete(':id/messages/:messageId')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  deleteMessage(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
  ) {
    return this.support.adminDeleteUserMessage(
      admin.id,
      assertSupportId(id),
      assertSupportId(messageId, 'message'),
    );
  }

  @Delete(':id')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  deleteThread(@CurrentAdmin() admin: AuthAdmin, @Param('id') id: string) {
    return this.support.adminDeleteThread(admin.id, assertSupportId(id));
  }
}
// --- End: Support live wire (Sachin) ---
