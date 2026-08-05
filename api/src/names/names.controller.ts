import { Controller, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { NamesService } from './names.service';

// --- Start: Names live wire (Sachin) ---
/** Public catalog — frames/fonts/policy only (no remote URLs). */
@Controller('api/v1/names')
export class NamesController {
  constructor(private readonly names: NamesService) {}

  @Get('catalog')
  @Throttle({ default: { limit: 90, ttl: 60_000 } })
  catalog() {
    return this.names.userCatalog();
  }
}
// --- End: Names live wire (Sachin) ---
