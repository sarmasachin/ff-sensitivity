import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import { ChallengeModuleGuard } from './challenge-module.guard';
import { ChallengeService } from './challenge.service';
import { SaveChallengeDto } from './dto/challenge.dto';

// --- Start: Challenge live wire (Sachin) ---
@Controller('api/v1/admin/challenge')
@UseGuards(JwtAuthGuard, ChallengeModuleGuard)
export class ChallengeAdminController {
  constructor(private readonly challenge: ChallengeService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  get() {
    return this.challenge.adminGetBundle();
  }

  @Put()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  save(@CurrentAdmin() admin: AuthAdmin, @Body() dto: SaveChallengeDto) {
    return this.challenge.adminSave(admin.id, dto);
  }
}
// --- End: Challenge live wire (Sachin) ---
