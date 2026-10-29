import { Module } from '@nestjs/common';
import { UsersAdminController } from './users-admin.controller';
import { UsersModuleGuard } from './users-module.guard';
import { UsersService } from './users.service';
import { UsersScreenJourneyService } from './users-screen-journey.service';
import { UsersActivityFeedService } from './users-activity-feed.service';
import { UsersPurgeService } from './users-purge.service';

// --- Start: Users admin live wire (Sachin) ---
@Module({
  controllers: [UsersAdminController],
  providers: [
    UsersService,
    UsersScreenJourneyService,
    UsersActivityFeedService,
    UsersPurgeService,
    UsersModuleGuard,
  ],
})
export class UsersAdminModule {}
// --- End: Users admin live wire (Sachin) ---
