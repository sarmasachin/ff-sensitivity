import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AppConfigAdminController } from './app-config-admin.controller';
import { AppConfigAdsAdminController } from './app-config-ads-admin.controller';
import { AppConfigController } from './app-config.controller';
import { AppConfigModuleGuard } from './app-config-module.guard';
import { AppConfigService } from './app-config.service';

// --- Start: App remote config live wire (Sachin) ---
@Module({
  imports: [AuthModule],
  controllers: [
    AppConfigController,
    AppConfigAdminController,
    AppConfigAdsAdminController,
  ],
  providers: [AppConfigService, AppConfigModuleGuard],
})
export class AppConfigModule {}
// --- End: App remote config live wire (Sachin) ---
