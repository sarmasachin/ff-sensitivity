import { Module } from '@nestjs/common';
import { AuditAdminController } from './audit-admin.controller';
import { AuditModuleGuard } from './audit-module.guard';
import { AuditService } from './audit.service';

// --- Start: Audit admin live wire (Sachin) ---
@Module({
  controllers: [AuditAdminController],
  providers: [AuditService, AuditModuleGuard],
})
export class AuditAdminModule {}
// --- End: Audit admin live wire (Sachin) ---
