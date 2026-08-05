import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OverviewModuleGuard } from './overview-module.guard';
import { OverviewService } from './overview.service';
import { parseOverviewSeriesRange } from './overview-series';

// --- Start: Overview KPIs live wire (Sachin) ---
/** Read-only ops pulse — no POST/PATCH/DELETE. */
@Controller('api/v1/admin/overview')
@UseGuards(JwtAuthGuard, OverviewModuleGuard)
export class OverviewAdminController {
  constructor(private readonly overview: OverviewService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  snapshot() {
    return this.overview.adminSnapshot();
  }

  @Get('series')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  series(@Query('range') range?: string) {
    return this.overview.adminSeries(parseOverviewSeriesRange(range));
  }
}
// --- End: Overview KPIs live wire (Sachin) ---
