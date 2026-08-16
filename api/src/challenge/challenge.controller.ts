import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserJwtAuthGuard } from '../user-auth/user-jwt-auth.guard';
import { CurrentUser } from '../user-auth/current-user.decorator';
import type { AuthUser } from '../user-auth/current-user.decorator';
import { ChallengeUserService } from './challenge-user.service';
import { SubmitQuizDto } from './dto/challenge.dto';

// --- Start: Challenge live wire (Sachin) ---
@Controller('api/v1/challenge')
@UseGuards(UserJwtAuthGuard)
export class ChallengeController {
  constructor(private readonly challenge: ChallengeUserService) {}

  @Get('today')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  today(@CurrentUser() user: AuthUser) {
    return this.challenge.today(user.id);
  }

  @Post('quiz/submit')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  submitQuiz(@CurrentUser() user: AuthUser, @Body() dto: SubmitQuizDto) {
    return this.challenge.submitQuiz(
      user.id,
      dto.questionId,
      dto.selectedIndex,
    );
  }

  @Post('quiz/second-chance')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  unlockSecondChance(@CurrentUser() user: AuthUser) {
    return this.challenge.unlockSecondChance(user.id);
  }
}
// --- End: Challenge live wire (Sachin) ---
