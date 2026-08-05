import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserJwtAuthGuard } from '../user-auth/user-jwt-auth.guard';
import { CurrentUser } from '../user-auth/current-user.decorator';
import type { AuthUser } from '../user-auth/current-user.decorator';
import { RedeemService } from './redeem.service';

// --- Start: Redeem live wire (Sachin) ---
@Controller('api/v1/redeem')
@UseGuards(UserJwtAuthGuard)
export class RedeemController {
  constructor(private readonly redeem: RedeemService) {}

  @Get('catalog')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  catalog(@CurrentUser() user: AuthUser) {
    return this.redeem.catalog(user.id);
  }

  // --- Start: Claims live wire (Sachin) ---
  @Get('claims')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  myClaims(@CurrentUser() user: AuthUser) {
    return this.redeem.myClaims(user.id);
  }
  // --- End: Claims live wire (Sachin) ---

  @Post(':id/claim')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  claim(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.redeem.claim(user.id, id);
  }
}
// --- End: Redeem live wire (Sachin) ---
