import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import { PushModuleGuard } from './push-module.guard';
import { PushService } from './push.service';
import { UpsertPushCampaignDto } from './dto/push.dto';

// --- Start: Push live wire (Sachin) ---
@Controller('api/v1/admin/push')
@UseGuards(JwtAuthGuard, PushModuleGuard)
export class PushAdminController {
  constructor(private readonly push: PushService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  list() {
    return this.push.adminList();
  }

  @Put()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  upsert(@CurrentAdmin() admin: AuthAdmin, @Body() dto: UpsertPushCampaignDto) {
    return this.push.adminUpsert(admin, dto);
  }

  @Post(':id/send')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  send(@CurrentAdmin() admin: AuthAdmin, @Param('id') id: string) {
    return this.push.adminSend(admin, id);
  }

  @Post(':id/cancel')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  cancel(@CurrentAdmin() admin: AuthAdmin, @Param('id') id: string) {
    return this.push.adminCancel(admin, id);
  }

  @Delete(':id')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  remove(@CurrentAdmin() admin: AuthAdmin, @Param('id') id: string) {
    return this.push.adminDelete(admin, id);
  }
}
// --- End: Push live wire (Sachin) ---
