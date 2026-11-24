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
exports.ScratchService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const scratch_shared_1 = require("./scratch-shared");
let ScratchService = class ScratchService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async ensureDefaults() {
        await (0, scratch_shared_1.ensureScratchDefaults)(this.prisma);
    }
    async adminGetBundle() {
        await (0, scratch_shared_1.ensureScratchDefaults)(this.prisma);
        const [config, prizes] = await Promise.all([
            this.prisma.scratchConfig.findUniqueOrThrow({ where: { id: scratch_shared_1.CONFIG_ID } }),
            this.prisma.scratchPrize.findMany({
                orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            }),
        ]);
        return {
            outcomeOdds: {
                coinsPercent: config.coinsPercent,
                redeemPercent: config.redeemPercent,
                coinAmount: config.coinAmount,
            },
            policy: {
                retentionDays: config.retentionDays,
                autoPurge: config.autoPurge,
                showExpired: config.showExpired,
            },
            prizes: prizes.map((p) => (0, scratch_shared_1.mapPrize)(p)),
        };
    }
    async adminSave(adminId, dto) {
        (0, scratch_shared_1.assertOutcomeOdds)(dto.outcomeOdds);
        if (dto.prizes !== undefined)
            (0, scratch_shared_1.assertPrizes)(dto.prizes);
        await this.prisma.$transaction(async (tx) => {
            await tx.scratchConfig.upsert({
                where: { id: scratch_shared_1.CONFIG_ID },
                update: {
                    coinsPercent: dto.outcomeOdds.coinsPercent,
                    redeemPercent: dto.outcomeOdds.redeemPercent,
                    coinAmount: dto.outcomeOdds.coinAmount,
                    retentionDays: dto.policy.retentionDays,
                    autoPurge: dto.policy.autoPurge,
                    showExpired: dto.policy.showExpired,
                },
                create: {
                    id: scratch_shared_1.CONFIG_ID,
                    ...scratch_shared_1.DEFAULT_CONFIG,
                    coinsPercent: dto.outcomeOdds.coinsPercent,
                    redeemPercent: dto.outcomeOdds.redeemPercent,
                    coinAmount: dto.outcomeOdds.coinAmount,
                    retentionDays: dto.policy.retentionDays,
                    autoPurge: dto.policy.autoPurge,
                    showExpired: dto.policy.showExpired,
                },
            });
            if (dto.prizes !== undefined) {
                await tx.scratchPrize.deleteMany({});
                if (dto.prizes.length) {
                    await tx.scratchPrize.createMany({
                        data: dto.prizes.map((p, i) => (0, scratch_shared_1.prizeWriteData)(p, i)),
                    });
                }
            }
            await tx.auditLog.create({
                data: {
                    actorAdminId: adminId,
                    action: 'scratch.save',
                    entity: 'scratch_config:default',
                    afterJson: {
                        prizeCount: dto.prizes?.length ?? null,
                        coinsPercent: dto.outcomeOdds.coinsPercent,
                        redeemPercent: dto.outcomeOdds.redeemPercent,
                    },
                },
            });
        });
        return this.adminGetBundle();
    }
};
exports.ScratchService = ScratchService;
exports.ScratchService = ScratchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ScratchService);
//# sourceMappingURL=scratch.service.js.map