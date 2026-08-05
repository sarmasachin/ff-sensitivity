import { Module } from '@nestjs/common';
import { UsersAdminController } from './users-admin.controller';
import { UsersModuleGuard } from './users-module.guard';
import { UsersService } from './users.service';

// --- Start: Users admin live wire (Sachin) ---
@Module({
  controllers: [UsersAdminController],
  providers: [UsersService, UsersModuleGuard],
})
export class UsersAdminModule {}
// --- End: Users admin live wire (Sachin) ---
