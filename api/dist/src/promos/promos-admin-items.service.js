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
exports.PromosAdminItemsService = void 0;
const common_1 = require("@nestjs/common");
const app_error_1 = require("../common/errors/app-error");
const prisma_service_1 = require("../prisma/prisma.service");
const promos_shared_1 = require("./promos-shared");
let PromosAdminItemsService = class PromosAdminItemsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(adminId, dto) {
        const count = await this.prisma.promo.count();
        if (count >= promos_shared_1.MAX_PROMOS) {
            throw new app_error_1.AppError('PROMOS_LIMIT', 'Promo table is full (max 40).', 400);
        }
        const data = (0, promos_shared_1.promoWriteData)(dto);
        try {
            const row = await this.prisma.$transaction(async (tx) => {
                const created = await tx.promo.create({ data });
                await (0, promos_shared_1.compactPromoOrders)(tx);
                return tx.promo.findUniqueOrThrow({ where: { id: created.id } });
            });
            await (0, promos_shared_1.auditPromos)(this.prisma, adminId, 'promos.create', `promo:${row.id}`, {
                id: row.id,
            });
            return (0, promos_shared_1.toPromoRow)(row);
        }
        catch (e) {
            (0, promos_shared_1.rethrowUnique)(e, 'PROMOS_DUP_ID', `Promo id already exists: ${data.id}`);
        }
    }
    async update(adminId, rawId, dto) {
        const id = (0, promos_shared_1.sanitizePromoId)(rawId);
        const existing = await this.prisma.promo.findUnique({ where: { id } });
        if (!existing) {
            throw new app_error_1.AppError('PROMOS_NOT_FOUND', 'Promo not found.', 404);
        }
        const data = (0, promos_shared_1.promoWriteData)({ ...dto, id });
        const row = await this.prisma.$transaction(async (tx) => {
            await tx.promo.update({
                where: { id },
                data: {
                    title: data.title,
                    subtitle: data.subtitle,
                    imageLabel: data.imageLabel,
                    deepLink: data.deepLink,
                    placement: data.placement,
                    sortOrder: data.sortOrder,
                    enabled: data.enabled,
                    startsAt: data.startsAt,
                    endsAt: data.endsAt,
                },
            });
            await (0, promos_shared_1.compactPromoOrders)(tx);
            return tx.promo.findUniqueOrThrow({ where: { id } });
        });
        await (0, promos_shared_1.auditPromos)(this.prisma, adminId, 'promos.update', `promo:${id}`, {
            id,
        });
        return (0, promos_shared_1.toPromoRow)(row);
    }
    async remove(adminId, rawId) {
        const id = (0, promos_shared_1.sanitizePromoId)(rawId);
        const deleted = await this.prisma.$transaction(async (tx) => {
            const result = await tx.promo.deleteMany({ where: { id } });
            if (result.count === 0) {
                throw new app_error_1.AppError('PROMOS_NOT_FOUND', 'Promo not found.', 404);
            }
            await (0, promos_shared_1.compactPromoOrders)(tx);
            return result;
        });
        await (0, promos_shared_1.auditPromos)(this.prisma, adminId, 'promos.delete', `promo:${id}`, {
            id,
        });
        return { ok: true, id, deleted: deleted.count };
    }
    async reorder(adminId, ids) {
        const unique = [...new Set(ids.map((id) => (0, promos_shared_1.sanitizePromoId)(id)))];
        const existing = await this.prisma.promo.findMany({ select: { id: true } });
        const existingIds = new Set(existing.map((r) => r.id));
        if (unique.length !== existing.length ||
            unique.some((id) => !existingIds.has(id))) {
            throw new app_error_1.AppError('PROMOS_REORDER_MISMATCH', 'Reorder list must include every promo id exactly once.', 400);
        }
        await this.prisma.$transaction(async (tx) => {
            for (let i = 0; i < unique.length; i++) {
                await tx.promo.update({
                    where: { id: unique[i] },
                    data: { sortOrder: i + 1 },
                });
            }
        });
        await (0, promos_shared_1.auditPromos)(this.prisma, adminId, 'promos.reorder', 'promos:catalog', {
            count: unique.length,
        });
        const rows = await this.prisma.promo.findMany({
            orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
        });
        return { promos: rows.map((r) => (0, promos_shared_1.toPromoRow)(r)) };
    }
};
exports.PromosAdminItemsService = PromosAdminItemsService;
exports.PromosAdminItemsService = PromosAdminItemsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PromosAdminItemsService);
//# sourceMappingURL=promos-admin-items.service.js.map