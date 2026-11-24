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
exports.NamesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const names_shared_1 = require("./names-shared");
let NamesService = class NamesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async ensureDefaults() {
        await (0, names_shared_1.ensureNamesDefaults)(this.prisma);
    }
    async adminGetBundle() {
        await (0, names_shared_1.ensureNamesDefaults)(this.prisma);
        const [cfg, frames, fonts] = await Promise.all([
            this.prisma.namesConfig.findUniqueOrThrow({ where: { id: names_shared_1.CONFIG_ID } }),
            this.prisma.nameFrame.findMany({ orderBy: { sortOrder: 'asc' } }),
            this.prisma.nameFont.findMany({ orderBy: { sortOrder: 'asc' } }),
        ]);
        return {
            policy: (0, names_shared_1.mapPolicy)(cfg),
            frames: frames.map((f) => (0, names_shared_1.mapFrame)(f)),
            fonts: fonts.map((f) => (0, names_shared_1.mapFont)(f)),
        };
    }
    async adminSave(adminId, dto) {
        if (dto.frames !== undefined)
            (0, names_shared_1.assertFrames)(dto.frames);
        if (dto.fonts !== undefined)
            (0, names_shared_1.assertFonts)(dto.fonts);
        const remoteUrl = (0, names_shared_1.assertSafeRemoteUrl)(dto.policy.remotePackEnabled, dto.policy.remotePackUrl);
        await this.prisma.$transaction(async (tx) => {
            await tx.namesConfig.upsert({
                where: { id: names_shared_1.CONFIG_ID },
                update: {
                    maxNameChars: dto.policy.maxNameChars,
                    maxBatchSize: dto.policy.maxBatchSize,
                    allowSpacesInInput: !dto.policy.blockSpaces,
                    requireStyleWrap: dto.policy.requireStyleWrap,
                    remotePackEnabled: dto.policy.remotePackEnabled,
                    remotePackUrl: remoteUrl,
                },
                create: {
                    id: names_shared_1.CONFIG_ID,
                    maxNameChars: dto.policy.maxNameChars,
                    maxBatchSize: dto.policy.maxBatchSize,
                    allowSpacesInInput: !dto.policy.blockSpaces,
                    requireStyleWrap: dto.policy.requireStyleWrap,
                    remotePackEnabled: dto.policy.remotePackEnabled,
                    remotePackUrl: remoteUrl,
                },
            });
            if (dto.frames !== undefined) {
                await tx.nameFrame.deleteMany({});
                if (dto.frames.length) {
                    await tx.nameFrame.createMany({
                        data: dto.frames.map((f, i) => (0, names_shared_1.frameWriteData)(f, i)),
                    });
                }
            }
            if (dto.fonts !== undefined) {
                await tx.nameFont.deleteMany({});
                await tx.nameFont.createMany({
                    data: dto.fonts.map((f, i) => (0, names_shared_1.fontWriteData)(f, i)),
                });
            }
            await tx.auditLog.create({
                data: {
                    actorAdminId: adminId,
                    action: 'names.save',
                    entity: 'names_config:default',
                    afterJson: {
                        frames: dto.frames?.length ?? null,
                        fonts: dto.fonts?.length ?? null,
                        maxNameChars: dto.policy.maxNameChars,
                    },
                },
            });
        });
        return this.adminGetBundle();
    }
    async userCatalog() {
        await (0, names_shared_1.ensureNamesDefaults)(this.prisma);
        const [cfg, frames, fonts] = await Promise.all([
            this.prisma.namesConfig.findUniqueOrThrow({ where: { id: names_shared_1.CONFIG_ID } }),
            this.prisma.nameFrame.findMany({
                where: { enabled: true },
                orderBy: { sortOrder: 'asc' },
            }),
            this.prisma.nameFont.findMany({
                where: { enabled: true },
                orderBy: { sortOrder: 'asc' },
            }),
        ]);
        return {
            policy: {
                maxNameChars: cfg.maxNameChars,
                maxBatchSize: cfg.maxBatchSize,
                blockSpaces: !cfg.allowSpacesInInput,
                requireStyleWrap: cfg.requireStyleWrap,
            },
            frames: frames.map((f) => ({
                id: f.id,
                label: f.label,
                prefix: f.prefix,
                suffix: f.suffix,
                premium: f.premium,
            })),
            fonts: fonts.map((f) => ({
                id: f.id,
                label: f.label,
                sample: f.sample,
            })),
        };
    }
};
exports.NamesService = NamesService;
exports.NamesService = NamesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NamesService);
//# sourceMappingURL=names.service.js.map