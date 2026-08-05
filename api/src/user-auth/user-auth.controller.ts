import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserAuthService } from './user-auth.service';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { UserLogoutDto } from './dto/user-logout.dto';
import { UserJwtAuthGuard } from './user-jwt-auth.guard';
import { CurrentUser, type AuthUser } from './current-user.decorator';

// --- Start: Redeem live wire (Sachin) ---
@Controller('api/v1/user/auth')
export class UserAuthController {
  constructor(private readonly userAuth: UserAuthService) {}

  @Post('google')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  google(@Body() dto: GoogleAuthDto) {
    return this.userAuth.loginWithGoogle(dto);
  }

  // --- Start: App analytics P2 logout (Sachin) ---
  @Post('logout')
  @UseGuards(UserJwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  logout(@CurrentUser() user: AuthUser, @Body() dto: UserLogoutDto) {
    return this.userAuth.logout(user.id, dto.installId);
  }
  // --- End: App analytics P2 logout (Sachin) ---
}
// --- End: Redeem live wire (Sachin) ---
