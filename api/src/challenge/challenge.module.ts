import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { EconomyModule } from '../economy/economy.module';
import { ChallengeAdminController } from './challenge-admin.controller';
import { ChallengeController } from './challenge.controller';
import { ChallengeModuleGuard } from './challenge-module.guard';
import { ChallengeService } from './challenge.service';

// --- Start: Challenge live wire (Sachin) ---
@Module({
  imports: [AuthModule, EconomyModule, AnalyticsModule],
  controllers: [ChallengeController, ChallengeAdminController],
  providers: [ChallengeService, ChallengeModuleGuard],
  exports: [ChallengeService],
})
export class ChallengeModule {}
// --- End: Challenge live wire (Sachin) ---
