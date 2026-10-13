import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserJwtAuthGuard } from '../user-auth/user-jwt-auth.guard';
import { CurrentUser } from '../user-auth/current-user.decorator';
import type { AuthUser } from '../user-auth/current-user.decorator';
import { RedeemService } from './redeem.service';
import { RedeemCommentDto } from './dto/redeem-comment.dto';
import { RedeemVoteDto } from './dto/redeem-vote.dto';
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

  @Get(':id/comments')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  comments(@Param('id') id: string) {
    return this.redeem.comments(id);
  }

  @Post(':id/comments')
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  addComment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RedeemCommentDto,
  ) {
    return this.redeem.addComment(user.id, id, dto.name, dto.text);
  }

  @Post(':id/vote')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  vote(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RedeemVoteDto,
  ) {
    return this.redeem.vote(user.id, id, dto.worked);
  }

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
