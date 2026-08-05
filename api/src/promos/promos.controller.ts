import { Controller, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PromosService } from './promos.service';

// --- Start: Promos live wire (Sachin) ---
/** Public live promos for Android home — no auth. */
@Controller('api/v1/promos')
export class PromosController {
  constructor(private readonly promos: PromosService) {}

  @Get('live')
  @Throttle({ default: { limit: 90, ttl: 60_000 } })
  live() {
    return this.promos.liveCatalog();
  }
}
// --- End: Promos live wire (Sachin) ---
