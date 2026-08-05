import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import { DevicesModuleGuard } from './devices-module.guard';
import { DevicesService } from './devices.service';
import { PatchDeviceNoteDto } from './dto/devices.dto';

// --- Start: Devices live wire (Sachin) ---
@Controller('api/v1/admin/devices')
@UseGuards(JwtAuthGuard, DevicesModuleGuard)
export class DevicesAdminController {
  constructor(private readonly devices: DevicesService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  list() {
    return this.devices.adminList();
  }

  @Post(':id/block')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  block(@CurrentAdmin() admin: AuthAdmin, @Param('id') id: string) {
    return this.devices.adminBlock(admin, id);
  }

  @Post(':id/unblock')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  unblock(@CurrentAdmin() admin: AuthAdmin, @Param('id') id: string) {
    return this.devices.adminUnblock(admin, id);
  }

  @Post(':id/invalidate-token')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  invalidate(@CurrentAdmin() admin: AuthAdmin, @Param('id') id: string) {
    return this.devices.adminInvalidateToken(admin, id);
  }

  @Patch(':id/note')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  note(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('id') id: string,
    @Body() dto: PatchDeviceNoteDto,
  ) {
    return this.devices.adminPatchNote(admin, id, dto);
  }
}
// --- End: Devices live wire (Sachin) ---
