import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditModuleGuard } from './audit-module.guard';
import { AuditService } from './audit.service';
import { assertAuditLimit } from './audit-security';

// --- Start: Audit admin live wire (Sachin) ---
/** Read-only immutable trail — no POST/PATCH/DELETE. */
@Controller('api/v1/admin/audit')
@UseGuards(JwtAuthGuard, AuditModuleGuard)
export class AuditAdminController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  list(@Query('limit') limitRaw?: string) {
    const limit = limitRaw ? assertAuditLimit(Number(limitRaw)) : 200;
    return this.audit.adminList(limit);
  }
}
// --- End: Audit admin live wire (Sachin) ---
