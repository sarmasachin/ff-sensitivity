import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import { ChallengeModuleGuard } from './challenge-module.guard';
import { ChallengeService } from './challenge.service';
import { ChallengeAdminItemsService } from './challenge-admin-items.service';
import {
  MilestoneDto,
  QuizQuestionDto,
  SaveChallengeDto,
} from './dto/challenge.dto';

// --- Start: Challenge live wire (Sachin) ---
@Controller('api/v1/admin/challenge')
@UseGuards(JwtAuthGuard, ChallengeModuleGuard)
export class ChallengeAdminController {
  constructor(
    private readonly challenge: ChallengeService,
    private readonly items: ChallengeAdminItemsService,
  ) {}

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

  @Post('quiz')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  createQuiz(
    @CurrentAdmin() admin: AuthAdmin,
    @Body() dto: QuizQuestionDto,
  ) {
    return this.items.createQuiz(admin.id, dto);
  }

  @Put('quiz/:id')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  updateQuiz(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('id') id: string,
    @Body() dto: QuizQuestionDto,
  ) {
    return this.items.updateQuiz(admin.id, id, dto);
  }

  @Delete('quiz/:id')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  deleteQuiz(@CurrentAdmin() admin: AuthAdmin, @Param('id') id: string) {
    return this.items.deleteQuiz(admin.id, id);
  }

  @Post('milestones')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  createMilestone(
    @CurrentAdmin() admin: AuthAdmin,
    @Body() dto: MilestoneDto,
  ) {
    return this.items.createMilestone(admin.id, dto);
  }

  @Put('milestones/:id')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  updateMilestone(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('id') id: string,
    @Body() dto: MilestoneDto,
  ) {
    return this.items.updateMilestone(admin.id, id, dto);
  }

  @Delete('milestones/:id')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  deleteMilestone(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('id') id: string,
  ) {
    return this.items.deleteMilestone(admin.id, id);
  }
}
// --- End: Challenge live wire (Sachin) ---
