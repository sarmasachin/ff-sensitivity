import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PromosAdminController } from './promos-admin.controller';
import { PromosController } from './promos.controller';
import { PromosModuleGuard } from './promos-module.guard';
import { PromosService } from './promos.service';

// --- Start: Promos live wire (Sachin) ---
@Module({
  imports: [AuthModule],
  controllers: [PromosController, PromosAdminController],
  providers: [PromosService, PromosModuleGuard],
})
export class PromosModule {}
// --- End: Promos live wire (Sachin) ---
