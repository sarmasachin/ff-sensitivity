import { Module } from '@nestjs/common';
import { SettingsAdminModule } from '../settings/settings.module';
import { StaffAdminController } from './staff-admin.controller';
import { StaffInviteMailService } from './staff-invite-mail.service';
import { StaffModuleGuard } from './staff-module.guard';
import { StaffService } from './staff.service';

// --- Start: Staff admin live wire (Sachin) ---
@Module({
  imports: [SettingsAdminModule],
  controllers: [StaffAdminController],
  providers: [StaffService, StaffModuleGuard, StaffInviteMailService],
})
export class StaffAdminModule {}
// --- End: Staff admin live wire (Sachin) ---
