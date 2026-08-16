import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { EconomyModule } from '../economy/economy.module';
import { RedeemModule } from '../redeem/redeem.module';
import { ScratchAdminController } from './scratch-admin.controller';
import { ScratchController } from './scratch.controller';
import { ScratchModuleGuard } from './scratch-module.guard';
import { ScratchService } from './scratch.service';
import { ScratchAdminPrizesService } from './scratch-admin-prizes.service';
import { ScratchUserService } from './scratch-user.service';

@Module({
  imports: [AuthModule, EconomyModule, RedeemModule, AnalyticsModule],
  controllers: [ScratchController, ScratchAdminController],
  providers: [
    ScratchService,
    ScratchAdminPrizesService,
    ScratchUserService,
    ScratchModuleGuard,
  ],
})
export class ScratchModule {}
