import { Module } from '@nestjs/common';
import { SettingsAdminController } from './settings-admin.controller';
import { SettingsModuleGuard } from './settings-module.guard';
import { SettingsService } from './settings.service';

// --- Start: Ops settings live wire (Sachin) ---
@Module({
  controllers: [SettingsAdminController],
  providers: [SettingsService, SettingsModuleGuard],
  exports: [SettingsService],
})
export class SettingsAdminModule {}
// --- End: Ops settings live wire (Sachin) ---
