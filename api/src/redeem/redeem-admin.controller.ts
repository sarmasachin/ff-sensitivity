import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AdminRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import { AppError } from '../common/errors/app-error';
import { RedeemModuleGuard } from './redeem-module.guard';
import { RedeemAdminService } from './redeem-admin.service';
import {
  CreateRedeemCodeDto,
  RevealRedeemCodeDto,
  UpdateRedeemCodeDto,
} from './dto/redeem-admin.dto';

@Controller('api/v1/admin/redeem')
@UseGuards(JwtAuthGuard, RedeemModuleGuard)
export class RedeemAdminController {
  constructor(private readonly redeem: RedeemAdminService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  list() {
    return this.redeem.list();
  }

  @Post()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  create(@CurrentAdmin() admin: AuthAdmin, @Body() dto: CreateRedeemCodeDto) {
    this.assertCanMutate(admin);
    return this.redeem.create(admin.id, dto);
  }

  @Patch(':id')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  update(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('id') id: string,
    @Body() dto: UpdateRedeemCodeDto,
  ) {
    this.assertCanMutate(admin);
    return this.redeem.update(admin.id, id, dto);
  }

  @Delete(':id')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  remove(@CurrentAdmin() admin: AuthAdmin, @Param('id') id: string) {
    this.assertCanMutate(admin);
    return this.redeem.remove(admin.id, id);
  }

  @Post(':id/reveal')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  reveal(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('id') id: string,
    @Body() dto: RevealRedeemCodeDto,
  ) {
    this.assertCanMutate(admin);
    return this.redeem.reveal(admin.id, id, dto.currentPassword);
  }

  private assertCanMutate(admin: AuthAdmin) {
    if (admin.role === AdminRole.VIEWER) {
      throw new AppError(
        'FORBIDDEN_ROLE',
        'Viewers cannot change redeem inventory.',
        403,
      );
    }
  }
}
