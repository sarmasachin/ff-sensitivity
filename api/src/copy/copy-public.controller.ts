import { Controller, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CopyService } from './copy.service';

// --- Start: Copy CMS live wire (Sachin) ---
@Controller('api/v1/app/copy')
export class CopyPublicController {
  constructor(private readonly copy: CopyService) {}

  @Get()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  live() {
    return this.copy.publicLive();
  }
}
// --- End: Copy CMS live wire (Sachin) ---
