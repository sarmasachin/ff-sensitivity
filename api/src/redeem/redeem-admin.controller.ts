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
import { RedeemAdminDefsService } from './redeem-admin-defs.service';
import {
  AppendRedeemPoolDto,
  CreateRedeemCadenceDto,
  CreateRedeemCodeDto,
  CreateRedeemTypeDto,
  RevealRedeemCodeDto,
  UpdateRedeemCadenceDto,
  UpdateRedeemCodeDto,
  UpdateRedeemTypeDto,
} from './dto/redeem-admin.dto';

@Controller('api/v1/admin/redeem')
@UseGuards(JwtAuthGuard, RedeemModuleGuard)
export class RedeemAdminController {
  constructor(
    private readonly redeem: RedeemAdminService,
    private readonly defs: RedeemAdminDefsService,
  ) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  list() {
    return this.redeem.list();
  }

  @Get('types')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  listTypes() {
    return this.defs.listTypes();
  }

  @Post('types')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  createType(
    @CurrentAdmin() admin: AuthAdmin,
    @Body() dto: CreateRedeemTypeDto,
  ) {
    this.assertCanMutate(admin);
    return this.defs.createType(admin.id, dto);
  }

  @Patch('types/:id')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  updateType(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('id') id: string,
    @Body() dto: UpdateRedeemTypeDto,
  ) {
    this.assertCanMutate(admin);
    return this.defs.updateType(admin.id, id, dto);
  }

  @Delete('types/:id')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  removeType(@CurrentAdmin() admin: AuthAdmin, @Param('id') id: string) {
    this.assertCanMutate(admin);
    return this.defs.removeType(admin.id, id);
  }

  @Get('cadences')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  listCadences() {
    return this.defs.listCadences();
  }

  @Post('cadences')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  createCadence(
    @CurrentAdmin() admin: AuthAdmin,
    @Body() dto: CreateRedeemCadenceDto,
  ) {
    this.assertCanMutate(admin);
    return this.defs.createCadence(admin.id, dto);
  }

  @Patch('cadences/:id')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  updateCadence(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('id') id: string,
    @Body() dto: UpdateRedeemCadenceDto,
  ) {
    this.assertCanMutate(admin);
    return this.defs.updateCadence(admin.id, id, dto);
  }

  @Delete('cadences/:id')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  removeCadence(@CurrentAdmin() admin: AuthAdmin, @Param('id') id: string) {
    this.assertCanMutate(admin);
    return this.defs.removeCadence(admin.id, id);
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

  @Post(':id/pool')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  appendPool(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('id') id: string,
    @Body() dto: AppendRedeemPoolDto,
  ) {
    this.assertCanMutate(admin);
    return this.redeem.appendPool(admin.id, id, dto);
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
