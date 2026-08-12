import { Module } from '@nestjs/common';
import { EconomyController } from './economy.controller';
import { EconomyService } from './economy.service';
import { ShopModule } from '../shop/shop.module';

// --- Start: Economy live wire (Sachin) ---
@Module({
  imports: [ShopModule],
  controllers: [EconomyController],
  providers: [EconomyService],
  exports: [EconomyService],
})
export class EconomyModule {}
// --- End: Economy live wire (Sachin) ---
