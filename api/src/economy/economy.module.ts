import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EconomyController } from './economy.controller';
import { EconomyAdminController } from './economy-admin.controller';
import { EconomyAdminService } from './economy-admin.service';
import { EconomyEarnService } from './economy-earn.service';
import { EconomyService } from './economy.service';
import { ShopModule } from '../shop/shop.module';

// --- Start: Economy live wire (Sachin) ---
@Module({
  imports: [ShopModule, AuthModule],
  controllers: [EconomyController, EconomyAdminController],
  providers: [EconomyService, EconomyEarnService, EconomyAdminService],
  exports: [EconomyService],
})
export class EconomyModule {}
// --- End: Economy live wire (Sachin) ---
