import { Module } from '@nestjs/common';
import { SettingsAdminModule } from '../settings/settings.module';
import { WalletsAdminController } from './wallets-admin.controller';
import { WalletsModuleGuard } from './wallets-module.guard';
import { WalletsService } from './wallets.service';

// --- Start: Wallets admin live wire (Sachin) ---
@Module({
  imports: [SettingsAdminModule],
  controllers: [WalletsAdminController],
  providers: [WalletsService, WalletsModuleGuard],
})
export class WalletsModule {}
// --- End: Wallets admin live wire (Sachin) ---
