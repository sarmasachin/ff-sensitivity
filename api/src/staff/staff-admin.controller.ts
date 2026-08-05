import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import { StaffModuleGuard } from './staff-module.guard';
import { StaffService } from './staff.service';
import { StaffInviteDto, StaffModulesDto } from './dto/staff.dto';

// --- Start: Staff admin live wire (Sachin) ---
@Controller('api/v1/admin/staff')
@UseGuards(JwtAuthGuard, StaffModuleGuard)
export class StaffAdminController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  list() {
    return this.staff.adminList();
  }

  @Post('invite')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  invite(@CurrentAdmin() admin: AuthAdmin, @Body() dto: StaffInviteDto) {
    return this.staff.invite(admin, dto);
  }

  @Patch(':id/modules')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  setModules(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('id') id: string,
    @Body() dto: StaffModulesDto,
  ) {
    return this.staff.setModules(admin, id, dto);
  }

  @Post(':id/disable')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  disable(@CurrentAdmin() admin: AuthAdmin, @Param('id') id: string) {
    return this.staff.disable(admin, id);
  }

  @Post(':id/enable')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  enable(@CurrentAdmin() admin: AuthAdmin, @Param('id') id: string) {
    return this.staff.enable(admin, id);
  }

  @Post(':id/resend-invite')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  resend(@CurrentAdmin() admin: AuthAdmin, @Param('id') id: string) {
    return this.staff.resendInvite(admin, id);
  }
}
// --- End: Staff admin live wire (Sachin) ---
