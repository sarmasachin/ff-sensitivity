import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import { NamesModuleGuard } from './names-module.guard';
import { NamesService } from './names.service';
import { SaveNamesDto } from './dto/names.dto';

// --- Start: Names live wire (Sachin) ---
@Controller('api/v1/admin/names')
@UseGuards(JwtAuthGuard, NamesModuleGuard)
export class NamesAdminController {
  constructor(private readonly names: NamesService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  get() {
    return this.names.adminGetBundle();
  }

  @Put()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  save(@CurrentAdmin() admin: AuthAdmin, @Body() dto: SaveNamesDto) {
    return this.names.adminSave(admin.id, dto);
  }
}
// --- End: Names live wire (Sachin) ---
