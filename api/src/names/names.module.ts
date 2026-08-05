import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NamesAdminController } from './names-admin.controller';
import { NamesController } from './names.controller';
import { NamesModuleGuard } from './names-module.guard';
import { NamesService } from './names.service';

// --- Start: Names live wire (Sachin) ---
@Module({
  imports: [AuthModule],
  controllers: [NamesController, NamesAdminController],
  providers: [NamesService, NamesModuleGuard],
})
export class NamesModule {}
// --- End: Names live wire (Sachin) ---
