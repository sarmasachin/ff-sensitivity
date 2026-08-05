import { Module } from '@nestjs/common';
import { SettingsAdminModule } from '../settings/settings.module';
import { StaffAdminController } from './staff-admin.controller';
import { StaffModuleGuard } from './staff-module.guard';
import { StaffService } from './staff.service';

// --- Start: Staff admin live wire (Sachin) ---
@Module({
  imports: [SettingsAdminModule],
  controllers: [StaffAdminController],
  providers: [StaffService, StaffModuleGuard],
})
export class StaffAdminModule {}
// --- End: Staff admin live wire (Sachin) ---
