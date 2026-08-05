import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommunityController } from './community.controller';
import { CommunityAdminController } from './community-admin.controller';
import { CommunityService } from './community.service';
import { CommunityModuleGuard } from './community-module.guard';

// --- Start: Community live wire (Sachin) ---
@Module({
  imports: [AuthModule],
  controllers: [CommunityController, CommunityAdminController],
  providers: [CommunityService, CommunityModuleGuard],
})
export class CommunityModule {}
// --- End: Community live wire (Sachin) ---
