import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import { UsersModuleGuard } from './users-module.guard';
import { UsersService } from './users.service';
import { UserNoteDto, UserStatusDto } from './dto/users.dto';

// --- Start: Users admin live wire (Sachin) ---
@Controller('api/v1/admin/users')
@UseGuards(JwtAuthGuard, UsersModuleGuard)
export class UsersAdminController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  list() {
    return this.users.adminListUsers();
  }

  @Post(':userId/status')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  setStatus(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('userId') userId: string,
    @Body() dto: UserStatusDto,
  ) {
    return this.users.adminSetStatus(admin, userId, dto);
  }

  @Post(':userId/note')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  setNote(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('userId') userId: string,
    @Body() dto: UserNoteDto,
  ) {
    return this.users.adminSetNote(admin, userId, dto);
  }
}
// --- End: Users admin live wire (Sachin) ---
