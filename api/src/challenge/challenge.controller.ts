import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserJwtAuthGuard } from '../user-auth/user-jwt-auth.guard';
import { CurrentUser } from '../user-auth/current-user.decorator';
import type { AuthUser } from '../user-auth/current-user.decorator';
import { ChallengeService } from './challenge.service';
import { SubmitQuizDto } from './dto/challenge.dto';

// --- Start: Challenge live wire (Sachin) ---
@Controller('api/v1/challenge')
@UseGuards(UserJwtAuthGuard)
export class ChallengeController {
  constructor(private readonly challenge: ChallengeService) {}

  @Get('today')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  today(@CurrentUser() user: AuthUser) {
    return this.challenge.userToday(user.id);
  }

  @Post('quiz/submit')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  submitQuiz(@CurrentUser() user: AuthUser, @Body() dto: SubmitQuizDto) {
    return this.challenge.userSubmitQuiz(
      user.id,
      dto.questionId,
      dto.selectedIndex,
    );
  }
}
// --- End: Challenge live wire (Sachin) ---
