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
import { ClaimsModuleGuard } from './claims-module.guard';
import { FlagClaimDto, RevealClaimDto } from './dto/claims-admin.dto';
import { RedeemClaimsService } from './redeem-claims.service';

// --- Start: Claims live wire (Sachin) ---
@Controller('api/v1/admin/claims')
@UseGuards(JwtAuthGuard, ClaimsModuleGuard)
export class ClaimsAdminController {
  constructor(private readonly claims: RedeemClaimsService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  list(@Query('q') q?: string) {
    return this.claims.adminListClaims(q);
  }

  @Get('stats')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  stats() {
    return this.claims.adminClaimsStats();
  }

  @Post(':id/reveal')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  reveal(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('id') id: string,
    @Body() dto: RevealClaimDto,
  ) {
    if (!id?.trim() || id.includes('/')) {
      throw new AppError('CLAIM_BAD_ID', 'Invalid claim id.', 400);
    }
    return this.claims.adminRevealClaim(
      admin.id,
      id.trim(),
      dto.currentPassword,
    );
  }

  @Patch(':id/flag')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  flag(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('id') id: string,
    @Body() dto: FlagClaimDto,
  ) {
    if (!id?.trim() || id.includes('/')) {
      throw new AppError('CLAIM_BAD_ID', 'Invalid claim id.', 400);
    }
    return this.claims.adminFlagClaim(
      admin.id,
      id.trim(),
      dto.flagged,
      dto.note,
    );
  }

  @Delete(':id')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  remove(@CurrentAdmin() admin: AuthAdmin, @Param('id') id: string) {
    if (!id?.trim() || id.includes('/')) {
      throw new AppError('CLAIM_BAD_ID', 'Invalid claim id.', 400);
    }
    return this.claims.adminDeleteClaim(admin.id, id.trim());
  }
}
// --- End: Claims live wire (Sachin) ---
