import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { DevicesAdminController } from './devices-admin.controller';
import { DevicesController } from './devices.controller';
import { DevicesModuleGuard } from './devices-module.guard';
import { DevicesService } from './devices.service';

// --- Start: Devices live wire (Sachin) ---
@Module({
  imports: [AnalyticsModule],
  controllers: [DevicesController, DevicesAdminController],
  providers: [DevicesService, DevicesModuleGuard],
  exports: [DevicesService],
})
export class DevicesModule {}
// --- End: Devices live wire (Sachin) ---
