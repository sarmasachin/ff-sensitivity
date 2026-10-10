import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import { EconomyAdminService } from './economy-admin.service';
import { SaveEconomyDto } from './dto/economy-admin.dto';

@Controller('api/v1/admin/economy')
@UseGuards(JwtAuthGuard)
export class EconomyAdminController {
  constructor(private readonly economy: EconomyAdminService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  get() {
    return this.economy.getConfig();
  }

  @Put()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  save(@CurrentAdmin() admin: AuthAdmin, @Body() dto: SaveEconomyDto) {
    return this.economy.saveConfig(admin, dto);
  }
}
