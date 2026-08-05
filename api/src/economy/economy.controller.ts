import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserJwtAuthGuard } from '../user-auth/user-jwt-auth.guard';
import { CurrentUser } from '../user-auth/current-user.decorator';
import type { AuthUser } from '../user-auth/current-user.decorator';
import { EconomyService } from './economy.service';
import { ChallengeEarnDto, ShopPurchaseDto } from './dto/economy.dto';

// --- Start: Economy live wire (Sachin) ---
@Controller('api/v1/economy')
@UseGuards(UserJwtAuthGuard)
export class EconomyController {
  constructor(private readonly economy: EconomyService) {}

  @Get('wallet')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  wallet(@CurrentUser() user: AuthUser) {
    return this.economy.getWallet(user.id);
  }

  @Post('challenge/earn')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  earn(@CurrentUser() user: AuthUser, @Body() dto: ChallengeEarnDto) {
    return this.economy.earnChallenge(user.id, dto.kind, {
      correct: dto.correct,
      milestoneDays: dto.milestoneDays,
    });
  }

  @Post('shop/purchase')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  purchase(@CurrentUser() user: AuthUser, @Body() dto: ShopPurchaseDto) {
    return this.economy.purchaseShop(user.id, dto.itemId, dto.requestId);
  }
}
// --- End: Economy live wire (Sachin) ---
