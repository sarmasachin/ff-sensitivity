import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommunityPostStatus } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import { AppError } from '../common/errors/app-error';
import { CommunityModuleGuard } from './community-module.guard';
import { CommunityService } from './community.service';
import { UpdateCommunityStatusDto } from './dto/community.dto';

// --- Start: Community live wire (Sachin) ---
@Controller('api/v1/admin/community')
@UseGuards(JwtAuthGuard, CommunityModuleGuard)
export class CommunityAdminController {
  constructor(private readonly community: CommunityService) {}

  @Get('posts')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  list(
    @Query('q') q?: string,
    @Query('status') status?: string,
  ) {
    return this.community.adminList(q, status);
  }

  @Get('stats')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  stats() {
    return this.community.adminStats();
  }

  @Patch('posts/:id/status')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  setStatus(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('id') id: string,
    @Body() dto: UpdateCommunityStatusDto,
  ) {
    if (!id?.trim() || id.includes('/') || id.length > 64) {
      throw new AppError('COMMUNITY_BAD_ID', 'Invalid post id.', 400);
    }
    return this.community.adminSetStatus(
      admin.id,
      id.trim(),
      dto.status as CommunityPostStatus,
    );
  }
}
// --- End: Community live wire (Sachin) ---
