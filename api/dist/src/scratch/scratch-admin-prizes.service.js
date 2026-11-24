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
exports.ScratchAdminPrizesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const app_error_1 = require("../common/errors/app-error");
const scratch_shared_1 = require("./scratch-shared");
let ScratchAdminPrizesService = class ScratchAdminPrizesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(adminId, dto) {
        (0, scratch_shared_1.assertPrizes)([dto]);
        const count = await this.prisma.scratchPrize.count();
        if (count >= 200) {
            throw new app_error_1.AppError('SCRATCH_PRIZE_LIMIT', 'Too many prizes.', 400);
        }
        const first = await this.prisma.scratchPrize.findFirst({
            orderBy: { sortOrder: 'asc' },
            select: { sortOrder: true },
        });
        const data = (0, scratch_shared_1.prizeWriteData)(dto, (first?.sortOrder ?? 0) - 1);
        try {
            const row = await this.prisma.scratchPrize.create({ data });
            await (0, scratch_shared_1.auditScratch)(this.prisma, adminId, 'scratch.prize.create', `scratch_prize:${row.id}`, { id: row.id, kind: row.kind });
            return (0, scratch_shared_1.mapPrize)(row);
        }
        catch (e) {
            (0, scratch_shared_1.rethrowUnique)(e, 'SCRATCH_DUP_PRIZE', `Prize id already exists: ${data.id}`);
        }
    }
    async update(adminId, rawId, dto) {
        (0, scratch_shared_1.assertPrizes)([dto]);
        const id = (0, scratch_shared_1.sanitizeId)(rawId, 'prize');
        const existing = await this.prisma.scratchPrize.findUnique({ where: { id } });
        if (!existing) {
            throw new app_error_1.AppError('SCRATCH_PRIZE_NOT_FOUND', 'Prize not found.', 404);
        }
        const row = await this.prisma.scratchPrize.update({
            where: { id },
            data: {
                title: dto.title.trim(),
                detail: dto.detail.trim(),
                kind: dto.kind,
                rewardLabel: dto.rewardLabel.trim(),
                coinReward: dto.coinReward,
                oddsPercent: dto.oddsPercent,
                enabled: dto.enabled,
                streakDays: dto.streakDays ?? null,
            },
        });
        await (0, scratch_shared_1.auditScratch)(this.prisma, adminId, 'scratch.prize.update', `scratch_prize:${id}`, { id });
        return (0, scratch_shared_1.mapPrize)(row);
    }
    async delete(adminId, rawId) {
        const id = (0, scratch_shared_1.sanitizeId)(rawId, 'prize');
        const deleted = await this.prisma.scratchPrize.deleteMany({ where: { id } });
        if (deleted.count === 0) {
            throw new app_error_1.AppError('SCRATCH_PRIZE_NOT_FOUND', 'Prize not found.', 404);
        }
        await (0, scratch_shared_1.auditScratch)(this.prisma, adminId, 'scratch.prize.delete', `scratch_prize:${id}`, { id });
        return { ok: true, id };
    }
};
exports.ScratchAdminPrizesService = ScratchAdminPrizesService;
exports.ScratchAdminPrizesService = ScratchAdminPrizesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ScratchAdminPrizesService);
//# sourceMappingURL=scratch-admin-prizes.service.js.map