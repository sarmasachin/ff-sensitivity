import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupportAdminController } from './support-admin.controller';
import { SupportController } from './support.controller';
import { SupportAdminInboxService } from './support-admin-inbox.service';
import { SupportModuleGuard } from './support-module.guard';
import { SupportService } from './support.service';

// --- Start: Support live wire (Sachin) ---
@Module({
  imports: [AuthModule],
  controllers: [SupportController, SupportAdminController],
  providers: [SupportService, SupportAdminInboxService, SupportModuleGuard],
})
export class SupportModule {}
// --- End: Support live wire (Sachin) ---
