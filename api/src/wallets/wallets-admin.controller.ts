import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import { WalletsModuleGuard } from './wallets-module.guard';
import { WalletsService } from './wallets.service';
import { WalletAdjustDto, WalletFreezeDto } from './dto/wallets.dto';

// --- Start: Wallets admin live wire (Sachin) ---
@Controller('api/v1/admin/wallets')
@UseGuards(JwtAuthGuard, WalletsModuleGuard)
export class WalletsAdminController {
  constructor(private readonly wallets: WalletsService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  list() {
    return this.wallets.adminListWallets();
  }

  @Get('ledger')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  ledger() {
    return this.wallets.adminListLedger();
  }

  @Post(':userId/grant')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  grant(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('userId') userId: string,
    @Body() dto: WalletAdjustDto,
  ) {
    return this.wallets.adminGrant(admin, userId, dto);
  }

  @Post(':userId/revoke')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  revoke(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('userId') userId: string,
    @Body() dto: WalletAdjustDto,
  ) {
    return this.wallets.adminRevoke(admin, userId, dto);
  }

  @Post(':userId/freeze')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  freeze(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('userId') userId: string,
    @Body() dto: WalletFreezeDto,
  ) {
    return this.wallets.adminFreeze(admin, userId, dto.action);
  }
}
// --- End: Wallets admin live wire (Sachin) ---
