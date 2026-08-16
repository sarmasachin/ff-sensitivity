import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PromosAdminController } from './promos-admin.controller';
import { PromosController } from './promos.controller';
import { PromosAdminItemsService } from './promos-admin-items.service';
import { PromosModuleGuard } from './promos-module.guard';
import { PromosService } from './promos.service';

@Module({
  imports: [AuthModule],
  controllers: [PromosController, PromosAdminController],
  providers: [PromosService, PromosAdminItemsService, PromosModuleGuard],
})
export class PromosModule {}
// --- End: Promos live wire (Sachin) ---
