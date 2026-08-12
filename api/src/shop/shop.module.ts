import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ShopAdminController } from './shop-admin.controller';
import { ShopAdminService } from './shop-admin.service';
import { ShopModuleGuard } from './shop-module.guard';

// --- Start: Shop live wire (Sachin) ---
@Module({
  imports: [AuthModule],
  controllers: [ShopAdminController],
  providers: [ShopAdminService, ShopModuleGuard],
  exports: [ShopAdminService],
})
export class ShopModule {}
// --- End: Shop live wire (Sachin) ---
