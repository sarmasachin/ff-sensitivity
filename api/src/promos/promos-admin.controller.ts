import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import { PromosModuleGuard } from './promos-module.guard';
import { PromosService } from './promos.service';
import { SavePromosDto } from './dto/promos.dto';

// --- Start: Promos live wire (Sachin) ---
@Controller('api/v1/admin/promos')
@UseGuards(JwtAuthGuard, PromosModuleGuard)
export class PromosAdminController {
  constructor(private readonly promos: PromosService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  list() {
    return this.promos.adminList();
  }

  @Put()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  save(@CurrentAdmin() admin: AuthAdmin, @Body() dto: SavePromosDto) {
    return this.promos.adminSave(admin.id, dto);
  }
}
// --- End: Promos live wire (Sachin) ---
