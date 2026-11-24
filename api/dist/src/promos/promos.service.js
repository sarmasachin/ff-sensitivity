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
exports.PromosService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const promos_shared_1 = require("./promos-shared");
let PromosService = class PromosService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async adminList() {
        const rows = await this.prisma.promo.findMany({
            orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
        });
        return { promos: rows.map((r) => (0, promos_shared_1.toPromoRow)(r)) };
    }
    async adminSave(adminId, dto) {
        (0, promos_shared_1.assertPromos)(dto.promos);
        const normalized = dto.promos
            .map((row) => (0, promos_shared_1.promoWriteData)(row))
            .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
            .map((row, i) => ({ ...row, sortOrder: i + 1 }));
        await this.prisma.$transaction(async (tx) => {
            await tx.promo.deleteMany({});
            if (normalized.length > 0) {
                await tx.promo.createMany({ data: normalized });
            }
            await (0, promos_shared_1.compactPromoOrders)(tx);
            await tx.auditLog.create({
                data: {
                    actorAdminId: adminId,
                    action: 'promos.save',
                    entity: 'promos:catalog',
                    afterJson: { count: normalized.length },
                },
            });
        });
        return this.adminList();
    }
    async liveCatalog() {
        const now = new Date();
        const rows = await this.prisma.promo.findMany({
            where: {
                enabled: true,
                startsAt: { lte: now },
                endsAt: { gte: now },
            },
            orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
            take: 40,
        });
        return {
            promos: rows.map((r) => ({
                id: r.id,
                title: r.title,
                subtitle: r.subtitle,
                imageLabel: r.imageLabel,
                deepLink: r.deepLink,
                placement: r.placement,
                sortOrder: r.sortOrder,
            })),
        };
    }
};
exports.PromosService = PromosService;
exports.PromosService = PromosService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PromosService);
//# sourceMappingURL=promos.service.js.map