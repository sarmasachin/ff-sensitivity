import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DevicesModule } from '../devices/devices.module';
import { PushAdminController } from './push-admin.controller';
import { PushController } from './push.controller';
import { PushModuleGuard } from './push-module.guard';
import { PushService } from './push.service';

// --- Start: Push live wire (Sachin) ---
@Module({
  imports: [AuthModule, DevicesModule],
  controllers: [PushController, PushAdminController],
  providers: [PushService, PushModuleGuard],
})
export class PushModule {}
// --- End: Push live wire (Sachin) ---
