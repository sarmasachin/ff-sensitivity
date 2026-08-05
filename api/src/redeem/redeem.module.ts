import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { SettingsAdminModule } from '../settings/settings.module';
import { ClaimsAdminController } from './claims-admin.controller';
import { ClaimsModuleGuard } from './claims-module.guard';
import { RedeemController } from './redeem.controller';
import { RedeemService } from './redeem.service';

// --- Start: Redeem live wire (Sachin) ---
@Module({
  imports: [AuthModule, SettingsAdminModule, AnalyticsModule],
  controllers: [RedeemController, ClaimsAdminController],
  providers: [RedeemService, ClaimsModuleGuard],
  exports: [RedeemService],
})
export class RedeemModule {}
// --- End: Redeem live wire (Sachin) ---
