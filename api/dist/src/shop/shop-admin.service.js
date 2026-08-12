"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopAdminService = void 0;
const common_1 = require("@nestjs/common");
const app_error_1 = require("../common/errors/app-error");
const prisma_service_1 = require("../prisma/prisma.service");
const shop_admin_security_1 = require("./shop-admin.security");
let ShopAdminService = class ShopAdminService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listCategories() {
        const rows = await this.prisma.shopCategoryDef.findMany({
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        });
        return { categories: rows };
    }
    async createCategory(adminId, dto) {
        const id = (0, shop_admin_security_1.assertCategoryId)(dto.id);
        const label = (0, shop_admin_security_1.sanitizeShopText)(dto.label, 40);
        if (!label)
            throw new app_error_1.AppError('SHOP_BAD_LABEL', 'Label is required.', 400);
        const existing = await this.prisma.shopCategoryDef.findUnique({
            where: { id },
        });
        if (existing) {
            throw new app_error_1.AppError('SHOP_CATEGORY_TAKEN', 'Category id already exists.', 409);
        }
        const row = await this.prisma.shopCategoryDef.create({
            data: {
                id,
                label,
                sortOrder: (0, shop_admin_security_1.assertSortOrder)(dto.sortOrder, 0),
                enabled: dto.enabled ?? true,
                isBoost: dto.isBoost ?? id === 'BOOST',
            },
        });
        await this.audit(adminId, 'shop.category.create', id, { label: row.label });
        return row;
    }
    async updateCategory(adminId, idRaw, dto) {
        const id = (0, shop_admin_security_1.assertCategoryId)(idRaw);
        const existing = await this.prisma.shopCategoryDef.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new app_error_1.AppError('SHOP_CATEGORY_NOT_FOUND', 'Category not found.', 404);
        }
        const data = {};
        if (dto.label != null)
            data.label = (0, shop_admin_security_1.sanitizeShopText)(dto.label, 40);
        if (dto.sortOrder != null)
            data.sortOrder = (0, shop_admin_security_1.assertSortOrder)(dto.sortOrder);
        if (dto.enabled != null)
            data.enabled = dto.enabled;
        if (dto.isBoost != null)
            data.isBoost = dto.isBoost;
        const row = await this.prisma.shopCategoryDef.update({ where: { id }, data });
        await this.audit(adminId, 'shop.category.update', id, { label: row.label });
        return row;
    }
    async removeCategory(adminId, idRaw) {
        const id = (0, shop_admin_security_1.assertCategoryId)(idRaw);
        const existing = await this.prisma.shopCategoryDef.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new app_error_1.AppError('SHOP_CATEGORY_NOT_FOUND', 'Category not found.', 404);
        }
        const used = await this.prisma.shopItem.count({ where: { category: id } });
        if (used > 0) {
            throw new app_error_1.AppError('SHOP_CATEGORY_IN_USE', `Category is used by ${used} item(s). Move or delete those first.`, 409);
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
    async findPurchaseItem(itemId) {
        const id = (0, shop_admin_security_1.assertShopItemId)(itemId);
        const row = await this.prisma.shopItem.findUnique({ where: { id } });
        if (!row || !row.enabled || row.priceCoins <= 0)
            return null;
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
    async create(adminId, dto) {
        const id = (0, shop_admin_security_1.assertShopItemId)(dto.id);
        if (await this.prisma.shopItem.findUnique({ where: { id } })) {
            throw new app_error_1.AppError('SHOP_ID_TAKEN', 'An item with this ID already exists.', 409);
        }
        const data = await this.parseWrite(dto, true);
        const row = await this.prisma.shopItem.create({
            data: { ...data, id },
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
    async update(adminId, idRaw, dto) {
        const id = (0, shop_admin_security_1.assertShopItemId)(idRaw);
        if (!(await this.prisma.shopItem.findUnique({ where: { id } }))) {
            throw new app_error_1.AppError('SHOP_NOT_FOUND', 'Item not found.', 404);
        }
        const data = await this.parseWrite(dto, false);
        const row = await this.prisma.shopItem.update({
            where: { id },
            data: data,
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
    async remove(adminId, idRaw) {
        const id = (0, shop_admin_security_1.assertShopItemId)(idRaw);
        const existing = await this.prisma.shopItem.findUnique({
            where: { id },
            select: { id: true, title: true },
        });
        if (!existing)
            throw new app_error_1.AppError('SHOP_NOT_FOUND', 'Item not found.', 404);
        await this.prisma.shopItem.delete({ where: { id } });
        await this.audit(adminId, 'shop.delete', id, { title: existing.title });
        return { ok: true, id };
    }
    async requireCategory(id) {
        const cat = await this.prisma.shopCategoryDef.findUnique({ where: { id } });
        if (!cat || !cat.enabled) {
            throw new app_error_1.AppError('SHOP_BAD_CATEGORY', 'Unknown or disabled category. Add it under Categories first.', 400);
        }
        return cat;
    }
    async parseWrite(dto, create) {
        const data = {};
        if (dto.title != null || create) {
            const title = (0, shop_admin_security_1.sanitizeShopText)(dto.title ?? '', 80);
            if (create && !title)
                throw new app_error_1.AppError('SHOP_BAD_TITLE', 'Title is required.', 400);
            if (dto.title != null)
                data.title = title;
        }
        if (dto.subtitle != null || create) {
            const subtitle = (0, shop_admin_security_1.sanitizeShopText)(dto.subtitle ?? '', 200);
            if (create && !subtitle) {
                throw new app_error_1.AppError('SHOP_BAD_SUBTITLE', 'Subtitle is required.', 400);
            }
            if (dto.subtitle != null)
                data.subtitle = subtitle;
        }
        if (dto.category != null || create) {
            if (dto.category == null && create) {
                throw new app_error_1.AppError('SHOP_BAD_CATEGORY', 'Category is required.', 400);
            }
            if (dto.category != null) {
                const catId = (0, shop_admin_security_1.assertCategoryId)(dto.category);
                await this.requireCategory(catId);
                data.category = catId;
            }
        }
        if (dto.priceCoins != null || create) {
            if (dto.priceCoins == null && create) {
                throw new app_error_1.AppError('SHOP_BAD_PRICE', 'Price is required.', 400);
            }
            if (dto.priceCoins != null)
                data.priceCoins = (0, shop_admin_security_1.assertPriceCoins)(dto.priceCoins);
        }
        if (dto.enabled != null || create)
            data.enabled = dto.enabled ?? true;
        if (dto.oneTime != null || create)
            data.oneTime = dto.oneTime ?? true;
        if (dto.stockLimit !== undefined || create) {
            data.stockLimit =
                dto.stockLimit === undefined ? null : (0, shop_admin_security_1.assertStockLimit)(dto.stockLimit);
        }
        if (dto.rewardTag != null || create) {
            const rewardTag = (0, shop_admin_security_1.sanitizeShopText)(String(dto.rewardTag ?? '').toUpperCase(), 40);
            if (create && !rewardTag) {
                throw new app_error_1.AppError('SHOP_BAD_TAG', 'Reward tag is required.', 400);
            }
            if (dto.rewardTag != null)
                data.rewardTag = rewardTag;
        }
        if (dto.sortOrder != null || create) {
            data.sortOrder = (0, shop_admin_security_1.assertSortOrder)(dto.sortOrder, 0);
        }
        return data;
    }
    toListRow(row, categoryLabel) {
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
    async audit(adminId, action, entityId, afterJson) {
        await this.prisma.auditLog.create({
            data: {
                actorAdminId: adminId,
                action,
                entity: `shop:${entityId}`,
                afterJson: afterJson,
            },
        });
    }
};
exports.ShopAdminService = ShopAdminService;
exports.ShopAdminService = ShopAdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ShopAdminService);
//# sourceMappingURL=shop-admin.service.js.map