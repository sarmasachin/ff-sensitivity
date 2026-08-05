import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { OverviewAdminController } from './overview-admin.controller';
import { OverviewModuleGuard } from './overview-module.guard';
import { OverviewService } from './overview.service';

// --- Start: Overview KPIs live wire (Sachin) ---
@Module({
  imports: [AnalyticsModule],
  controllers: [OverviewAdminController],
  providers: [OverviewService, OverviewModuleGuard],
})
export class OverviewAdminModule {}
// --- End: Overview KPIs live wire (Sachin) ---
