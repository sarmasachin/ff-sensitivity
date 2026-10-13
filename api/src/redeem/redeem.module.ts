import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { SettingsAdminModule } from '../settings/settings.module';
import { ClaimsAdminController } from './claims-admin.controller';
import { ClaimsModuleGuard } from './claims-module.guard';
import { RedeemAdminController } from './redeem-admin.controller';
import { RedeemAdminService } from './redeem-admin.service';
import { RedeemAdminPoolService } from './redeem-admin-pool.service';
import { RedeemAdminDefsService } from './redeem-admin-defs.service';
import { RedeemController } from './redeem.controller';
import { RedeemModuleGuard } from './redeem-module.guard';
import { RedeemService } from './redeem.service';
import { RedeemScratchService } from './redeem-scratch.service';
import { RedeemScratchPassService } from './redeem-scratch-pass.service';
import { RedeemClaimsService } from './redeem-claims.service';
import { RedeemCatalogService } from './redeem-catalog.service';
import { RedeemVoteService } from './redeem-vote.service';
import { RedeemCommentService } from './redeem-comment.service';

// --- Start: Redeem live wire (Sachin) ---
@Module({
  imports: [AuthModule, SettingsAdminModule, AnalyticsModule],
  controllers: [RedeemController, ClaimsAdminController, RedeemAdminController],
  providers: [
    RedeemService,
    RedeemScratchService,
    RedeemScratchPassService,
    RedeemClaimsService,
    RedeemCatalogService,
    RedeemVoteService,
    RedeemCommentService,
    ClaimsModuleGuard,
    RedeemAdminService,
    RedeemAdminPoolService,
    RedeemAdminDefsService,
    RedeemModuleGuard,
  ],
  exports: [RedeemService],
})
export class RedeemModule {}
// --- End: Redeem live wire (Sachin) ---
