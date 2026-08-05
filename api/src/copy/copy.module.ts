import { Module } from '@nestjs/common';
import { CopyAdminController } from './copy-admin.controller';
import { CopyModuleGuard } from './copy-module.guard';
import { CopyPublicController } from './copy-public.controller';
import { CopyService } from './copy.service';

// --- Start: Copy CMS live wire (Sachin) ---
@Module({
  controllers: [CopyAdminController, CopyPublicController],
  providers: [CopyService, CopyModuleGuard],
})
export class CopyModule {}
// --- End: Copy CMS live wire (Sachin) ---
