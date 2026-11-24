import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserJwtAuthGuard } from '../user-auth/user-jwt-auth.guard';
import { CurrentUser } from '../user-auth/current-user.decorator';
import type { AuthUser } from '../user-auth/current-user.decorator';
import { CompareService } from './compare.service';
import { SaveCompareDto } from './dto/compare.dto';

@Controller('api/v1/compare')
@UseGuards(UserJwtAuthGuard)
export class CompareController {
  constructor(private readonly compare: CompareService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  list(
    @Query('fingers') fingers?: string,
    @Query('role') role?: string,
  ) {
    return this.compare.list(fingers, role);
  }

  /** Pro Max peer offsets — deep waterfall + quality/recency/confidence. */
  @Get('promax-offset')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  promaxOffset(
    @CurrentUser() user: AuthUser,
    @Query('fingers') fingers?: string,
    @Query('role') role?: string,
    @Query('deviceLabel') deviceLabel?: string,
    @Query('ramGb') ramGb?: string,
    @Query('processorBrand') processorBrand?: string,
    @Query('processorType') processorType?: string,
    @Query('gpuLabel') gpuLabel?: string,
    @Query('gpuVendor') gpuVendor?: string,
    @Query('dpiPreference') dpiPreference?: string,
    @Query('screenGuard') screenGuard?: string,
    @Query('refreshHz') refreshHz?: string,
    @Query('engine') engine?: string,
  ) {
    const ramParsed = ramGb != null && ramGb !== '' ? Number(ramGb) : undefined;
    const hzParsed =
      refreshHz != null && refreshHz !== '' ? Number(refreshHz) : undefined;
    return this.compare.promaxOffset({
      fingers,
      role,
      deviceLabel,
      ramGb: Number.isFinite(ramParsed) ? ramParsed : undefined,
      processorBrand,
      processorType,
      gpuLabel,
      gpuVendor,
      dpiPreference,
      screenGuard,
      refreshHz: Number.isFinite(hzParsed) ? hzParsed : undefined,
      excludeUserId: user.id,
      // Default promax bucket so old clients stay off one_tap peers.
      engine: engine?.trim() || 'promax',
    });
  }

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  save(@CurrentUser() user: AuthUser, @Body() dto: SaveCompareDto) {
    return this.compare.save(user.id, dto);
  }
}
