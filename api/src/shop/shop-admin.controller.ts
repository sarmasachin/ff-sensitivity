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
import { ShopModuleGuard } from './shop-module.guard';
import { ShopAdminService } from './shop-admin.service';
import {
  CreateShopCategoryDto,
  CreateShopItemDto,
  UpdateShopCategoryDto,
  UpdateShopItemDto,
} from './dto/shop-admin.dto';

@Controller('api/v1/admin/shop')
@UseGuards(JwtAuthGuard, ShopModuleGuard)
export class ShopAdminController {
  constructor(private readonly shop: ShopAdminService) {}

  @Get('categories')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  listCategories() {
    return this.shop.listCategories();
  }

  @Post('categories')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  createCategory(
    @CurrentAdmin() admin: AuthAdmin,
    @Body() dto: CreateShopCategoryDto,
  ) {
    this.assertCanMutate(admin);
    return this.shop.createCategory(admin.id, dto);
  }

  @Patch('categories/:id')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  updateCategory(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('id') id: string,
    @Body() dto: UpdateShopCategoryDto,
  ) {
    this.assertCanMutate(admin);
    return this.shop.updateCategory(admin.id, id, dto);
  }

  @Delete('categories/:id')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  removeCategory(@CurrentAdmin() admin: AuthAdmin, @Param('id') id: string) {
    this.assertCanMutate(admin);
    return this.shop.removeCategory(admin.id, id);
  }

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  list() {
    return this.shop.list();
  }

  @Post()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  create(@CurrentAdmin() admin: AuthAdmin, @Body() dto: CreateShopItemDto) {
    this.assertCanMutate(admin);
    return this.shop.create(admin.id, dto);
  }

  @Patch(':id')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  update(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('id') id: string,
    @Body() dto: UpdateShopItemDto,
  ) {
    this.assertCanMutate(admin);
    return this.shop.update(admin.id, id, dto);
  }

  @Delete(':id')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  remove(@CurrentAdmin() admin: AuthAdmin, @Param('id') id: string) {
    this.assertCanMutate(admin);
    return this.shop.remove(admin.id, id);
  }

  private assertCanMutate(admin: AuthAdmin) {
    if (admin.role === AdminRole.VIEWER) {
      throw new AppError(
        'FORBIDDEN_ROLE',
        'Viewers cannot change the shop catalog.',
        403,
      );
    }
  }
}
