import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NamesAdminController } from './names-admin.controller';
import { NamesController } from './names.controller';
import { NamesModuleGuard } from './names-module.guard';
import { NamesService } from './names.service';
import { NamesAdminItemsService } from './names-admin-items.service';

@Module({
  imports: [AuthModule],
  controllers: [NamesController, NamesAdminController],
  providers: [NamesService, NamesAdminItemsService, NamesModuleGuard],
})
export class NamesModule {}
