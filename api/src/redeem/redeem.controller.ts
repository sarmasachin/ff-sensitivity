import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserJwtAuthGuard } from '../user-auth/user-jwt-auth.guard';
import { CurrentUser } from '../user-auth/current-user.decorator';
import type { AuthUser } from '../user-auth/current-user.decorator';
import { RedeemService } from './redeem.service';
import { ScratchRedeemDto } from './dto/redeem-scratch.dto';

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

  @Post(':id/scratch')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  scratch(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ScratchRedeemDto,
  ) {
    return this.redeem.scratch(user.id, id, dto.attemptKey);
  }

  @Post(':id/scratch-ad-unlock')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  scratchAdUnlock(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.redeem.scratchAdUnlock(user.id, id);
  }

  @Post(':id/claim')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  claim(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.redeem.claim(user.id, id);
  }
}
// --- End: Redeem live wire (Sachin) ---
