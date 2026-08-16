import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import { PromosModuleGuard } from './promos-module.guard';
import { PromosAdminItemsService } from './promos-admin-items.service';
import { PromosService } from './promos.service';
import { PromoDto, ReorderPromosDto, SavePromosDto } from './dto/promos.dto';

@Controller('api/v1/admin/promos')
@UseGuards(JwtAuthGuard, PromosModuleGuard)
export class PromosAdminController {
  constructor(
    private readonly promos: PromosService,
    private readonly items: PromosAdminItemsService,
  ) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  list() {
    return this.promos.adminList();
  }

  @Put()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  save(@CurrentAdmin() admin: AuthAdmin, @Body() dto: SavePromosDto) {
    return this.promos.adminSave(admin.id, dto);
  }

  @Post()
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  create(@CurrentAdmin() admin: AuthAdmin, @Body() dto: PromoDto) {
    return this.items.create(admin.id, dto);
  }

  @Patch('reorder')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  reorder(@CurrentAdmin() admin: AuthAdmin, @Body() dto: ReorderPromosDto) {
    return this.items.reorder(admin.id, dto.ids);
  }

  @Put(':id')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  update(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('id') id: string,
    @Body() dto: PromoDto,
  ) {
    return this.items.update(admin.id, id, dto);
  }

  @Delete(':id')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  remove(@CurrentAdmin() admin: AuthAdmin, @Param('id') id: string) {
    return this.items.remove(admin.id, id);
  }
}
