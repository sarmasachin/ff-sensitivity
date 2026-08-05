import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import { ScratchModuleGuard } from './scratch-module.guard';
import { ScratchService } from './scratch.service';
import { SaveScratchDto } from './dto/scratch.dto';

// --- Start: Scratch live wire (Sachin) ---
@Controller('api/v1/admin/scratch')
@UseGuards(JwtAuthGuard, ScratchModuleGuard)
export class ScratchAdminController {
  constructor(private readonly scratch: ScratchService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  get() {
    return this.scratch.adminGetBundle();
  }

  @Put()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  save(@CurrentAdmin() admin: AuthAdmin, @Body() dto: SaveScratchDto) {
    return this.scratch.adminSave(admin.id, dto);
  }
}
// --- End: Scratch live wire (Sachin) ---
