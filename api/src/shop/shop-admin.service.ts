import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma/prisma.service';
import {
  assertCategoryId,
  assertPriceCoins,
  assertShopItemId,
  assertSortOrder,
  assertStockLimit,
  sanitizeShopText,
} from './shop-admin.security';
import type {
  CreateShopCategoryDto,
  CreateShopItemDto,
  UpdateShopCategoryDto,
  UpdateShopItemDto,
} from './dto/shop-admin.dto';

@Injectable()
export class ShopAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories() {
    const rows = await this.prisma.shopCategoryDef.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return { categories: rows };
  }

  async createCategory(adminId: string, dto: CreateShopCategoryDto) {
    const id = assertCategoryId(dto.id);
    const label = sanitizeShopText(dto.label, 40);
    if (!label) throw new AppError('SHOP_BAD_LABEL', 'Label is required.', 400);
    const existing = await this.prisma.shopCategoryDef.findUnique({
      where: { id },
    });
    if (existing) {
      throw new AppError('SHOP_CATEGORY_TAKEN', 'Category id already exists.', 409);
    }
    const row = await this.prisma.shopCategoryDef.create({
      data: {
        id,
        label,
        sortOrder: assertSortOrder(dto.sortOrder, 0),
        enabled: dto.enabled ?? true,
        isBoost: dto.isBoost ?? id === 'BOOST',
      },
    });
    await this.audit(adminId, 'shop.category.create', id, { label: row.label });
    return row;
  }

  async updateCategory(
    adminId: string,
    idRaw: string,
    dto: UpdateShopCategoryDto,
  ) {
    const id = assertCategoryId(idRaw);
    const existing = await this.prisma.shopCategoryDef.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new AppError('SHOP_CATEGORY_NOT_FOUND', 'Category not found.', 404);
    }
    const data: Prisma.ShopCategoryDefUpdateInput = {};
    if (dto.label != null) data.label = sanitizeShopText(dto.label, 40);
    if (dto.sortOrder != null) data.sortOrder = assertSortOrder(dto.sortOrder);
    if (dto.enabled != null) data.enabled = dto.enabled;
    if (dto.isBoost != null) data.isBoost = dto.isBoost;
    const row = await this.prisma.shopCategoryDef.update({ where: { id }, data });
    await this.audit(adminId, 'shop.category.update', id, { label: row.label });
    return row;
  }

  async removeCategory(adminId: string, idRaw: string) {
    const id = assertCategoryId(idRaw);
    const existing = await this.prisma.shopCategoryDef.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new AppError('SHOP_CATEGORY_NOT_FOUND', 'Category not found.', 404);
    }
    const used = await this.prisma.shopItem.count({ where: { category: id } });
    if (used > 0) {
      throw new AppError(
        'SHOP_CATEGORY_IN_USE',
        `Category is used by ${used} item(s). Move or delete those first.`,
        409,
      );
    }
    await this.prisma.shopCategoryDef.delete({ where: { id } });
    await this.audit(adminId, 'shop.category.delete', id, {
      label: existing.label,
    });
    return { ok: true, id };
  }

  async list() {
    const [rows, cats] = await Promise.all([
      this.prisma.shopItem.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.shopCategoryDef.findMany(),
    ]);
    const labelById = Object.fromEntries(cats.map((c) => [c.id, c.label]));
    return {
      items: rows.map((row) => this.toListRow(row, labelById[row.category])),
      categories: cats.sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)),
    };
  }

  async appCatalog() {
    const [rows, cats] = await Promise.all([
      this.prisma.shopItem.findMany({
        where: { enabled: true, priceCoins: { gt: 0 } },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.shopCategoryDef.findMany({
        where: { enabled: true },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      }),
    ]);
    const labelById = Object.fromEntries(cats.map((c) => [c.id, c.label]));
    return {
      categories: cats.map((c) => ({
        id: c.id,
        label: c.label,
        isBoost: c.isBoost,
      })),
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        subtitle: row.subtitle,
        category: row.category,
        categoryLabel: labelById[row.category] ?? row.category,
        priceCoins: row.priceCoins,
        enabled: row.enabled,
        oneTime: row.oneTime,
        stockLimit: row.stockLimit,
        rewardTag: row.rewardTag,
      })),
    };
  }

  async findPurchaseItem(itemId: string) {
    const id = assertShopItemId(itemId);
    const row = await this.prisma.shopItem.findUnique({ where: { id } });
    if (!row || !row.enabled || row.priceCoins <= 0) return null;
    const cat = await this.prisma.shopCategoryDef.findUnique({
      where: { id: row.category },
    });
    return {
      id: row.id,
      priceCoins: row.priceCoins,
      oneTime: row.oneTime,
      stockLimit: row.stockLimit,
      enabled: row.enabled,
      isBoost: cat?.isBoost === true || row.category === 'BOOST',
    };
  }

  async listPurchaseCatalog() {
    const rows = await this.prisma.shopItem.findMany({
      where: { enabled: true, priceCoins: { gt: 0 } },
    });
    const cats = await this.prisma.shopCategoryDef.findMany();
    const boost = new Set(cats.filter((c) => c.isBoost).map((c) => c.id));
    return rows.map((row) => ({
      id: row.id,
      priceCoins: row.priceCoins,
      oneTime: row.oneTime,
      stockLimit: row.stockLimit,
      enabled: row.enabled,
      isBoost: boost.has(row.category) || row.category === 'BOOST',
    }));
  }

  async create(adminId: string, dto: CreateShopItemDto) {
    const id = assertShopItemId(dto.id);
    if (await this.prisma.shopItem.findUnique({ where: { id } })) {
      throw new AppError('SHOP_ID_TAKEN', 'An item with this ID already exists.', 409);
    }
    const data = await this.parseWrite(dto, true);
    const row = await this.prisma.shopItem.create({
      data: { ...(data as Prisma.ShopItemCreateInput), id },
    });
    await this.audit(adminId, 'shop.create', row.id, {
      title: row.title,
      enabled: row.enabled,
    });
    const cat = await this.prisma.shopCategoryDef.findUnique({
      where: { id: row.category },
    });
    return this.toListRow(row, cat?.label);
  }

  async update(adminId: string, idRaw: string, dto: UpdateShopItemDto) {
    const id = assertShopItemId(idRaw);
    if (!(await this.prisma.shopItem.findUnique({ where: { id } }))) {
      throw new AppError('SHOP_NOT_FOUND', 'Item not found.', 404);
    }
    const data = await this.parseWrite(dto, false);
    const row = await this.prisma.shopItem.update({
      where: { id },
      data: data as Prisma.ShopItemUpdateInput,
    });
    await this.audit(adminId, 'shop.update', row.id, {
      title: row.title,
      enabled: row.enabled,
    });
    const cat = await this.prisma.shopCategoryDef.findUnique({
      where: { id: row.category },
    });
    return this.toListRow(row, cat?.label);
  }

  async remove(adminId: string, idRaw: string) {
    const id = assertShopItemId(idRaw);
    const existing = await this.prisma.shopItem.findUnique({
      where: { id },
      select: { id: true, title: true },
    });
    if (!existing) throw new AppError('SHOP_NOT_FOUND', 'Item not found.', 404);
    await this.prisma.shopItem.delete({ where: { id } });
    await this.audit(adminId, 'shop.delete', id, { title: existing.title });
    return { ok: true, id };
  }

  private async requireCategory(id: string) {
    const cat = await this.prisma.shopCategoryDef.findUnique({ where: { id } });
    if (!cat || !cat.enabled) {
      throw new AppError(
        'SHOP_BAD_CATEGORY',
        'Unknown or disabled category. Add it under Categories first.',
        400,
      );
    }
    return cat;
  }

  private async parseWrite(
    dto: CreateShopItemDto | UpdateShopItemDto,
    create: boolean,
  ) {
    const data: Record<string, unknown> = {};
    if (dto.title != null || create) {
      const title = sanitizeShopText(dto.title ?? '', 80);
      if (create && !title) throw new AppError('SHOP_BAD_TITLE', 'Title is required.', 400);
      if (dto.title != null) data.title = title;
    }
    if (dto.subtitle != null || create) {
      const subtitle = sanitizeShopText(dto.subtitle ?? '', 200);
      if (create && !subtitle) {
        throw new AppError('SHOP_BAD_SUBTITLE', 'Subtitle is required.', 400);
      }
      if (dto.subtitle != null) data.subtitle = subtitle;
    }
    if (dto.category != null || create) {
      if (dto.category == null && create) {
        throw new AppError('SHOP_BAD_CATEGORY', 'Category is required.', 400);
      }
      if (dto.category != null) {
        const catId = assertCategoryId(dto.category);
        await this.requireCategory(catId);
        data.category = catId;
      }
    }
    if (dto.priceCoins != null || create) {
      if (dto.priceCoins == null && create) {
        throw new AppError('SHOP_BAD_PRICE', 'Price is required.', 400);
      }
      if (dto.priceCoins != null) data.priceCoins = assertPriceCoins(dto.priceCoins);
    }
    if (dto.enabled != null || create) data.enabled = dto.enabled ?? true;
    if (dto.oneTime != null || create) data.oneTime = dto.oneTime ?? true;
    if (dto.stockLimit !== undefined || create) {
      data.stockLimit =
        dto.stockLimit === undefined ? null : assertStockLimit(dto.stockLimit);
    }
    if (dto.rewardTag != null || create) {
      const rewardTag = sanitizeShopText(
        String(dto.rewardTag ?? '').toUpperCase(),
        40,
      );
      if (create && !rewardTag) {
        throw new AppError('SHOP_BAD_TAG', 'Reward tag is required.', 400);
      }
      if (dto.rewardTag != null) data.rewardTag = rewardTag;
    }
    if (dto.sortOrder != null || create) {
      data.sortOrder = assertSortOrder(dto.sortOrder, 0);
    }
    return data;
  }

  private toListRow(
    row: {
      id: string;
      title: string;
      subtitle: string;
      category: string;
      priceCoins: number;
      enabled: boolean;
      oneTime: boolean;
      stockLimit: number | null;
      rewardTag: string;
      sortOrder: number;
    },
    categoryLabel?: string,
  ) {
    return {
      id: row.id,
      title: row.title,
      subtitle: row.subtitle,
      category: row.category,
      categoryLabel: categoryLabel ?? row.category,
      priceCoins: row.priceCoins,
      enabled: row.enabled,
      oneTime: row.oneTime,
      stockLimit: row.stockLimit,
      rewardTag: row.rewardTag,
      sortOrder: row.sortOrder,
    };
  }

  private async audit(
    adminId: string,
    action: string,
    entityId: string,
    afterJson: Record<string, unknown>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorAdminId: adminId,
        action,
        entity: `shop:${entityId}`,
        afterJson: afterJson as Prisma.InputJsonValue,
      },
    });
  }
}
