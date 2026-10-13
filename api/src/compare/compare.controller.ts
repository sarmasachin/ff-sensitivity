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

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  save(@CurrentUser() user: AuthUser, @Body() dto: SaveCompareDto) {
    return this.compare.save(user.id, dto);
  }
}
