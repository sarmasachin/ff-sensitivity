import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, type AuthUser } from '../user-auth/current-user.decorator';
import { UserJwtAuthGuard } from '../user-auth/user-jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserProfileService } from './user-profile.service';

@Controller('api/v1/user/profile')
@UseGuards(UserJwtAuthGuard)
export class UserProfileController {
  constructor(private readonly profile: UserProfileService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  get(@CurrentUser() user: AuthUser) {
    return this.profile.get(user.id);
  }

  @Patch()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.profile.update(user.id, dto);
  }

  @Post('delete')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  deleteAccount(@CurrentUser() user: AuthUser) {
    return this.profile.deleteAccount(user.id);
  }
}
