import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { SettingsAdminModule } from '../settings/settings.module';
import { ClaimsAdminController } from './claims-admin.controller';
import { ClaimsModuleGuard } from './claims-module.guard';
import { RedeemAdminController } from './redeem-admin.controller';
import { RedeemAdminService } from './redeem-admin.service';
import { RedeemController } from './redeem.controller';
import { RedeemModuleGuard } from './redeem-module.guard';
import { RedeemService } from './redeem.service';

// --- Start: Redeem live wire (Sachin) ---
@Module({
  imports: [AuthModule, SettingsAdminModule, AnalyticsModule],
  controllers: [RedeemController, ClaimsAdminController, RedeemAdminController],
  providers: [
    RedeemService,
    ClaimsModuleGuard,
    RedeemAdminService,
    RedeemModuleGuard,
  ],
  exports: [RedeemService],
})
export class RedeemModule {}
// --- End: Redeem live wire (Sachin) ---
