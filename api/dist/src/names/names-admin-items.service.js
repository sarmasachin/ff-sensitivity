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
exports.NamesAdminItemsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const app_error_1 = require("../common/errors/app-error");
const names_shared_1 = require("./names-shared");
let NamesAdminItemsService = class NamesAdminItemsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createFrame(adminId, dto) {
        (0, names_shared_1.assertFrames)([dto]);
        const count = await this.prisma.nameFrame.count();
        if (count >= names_shared_1.MAX_FRAMES) {
            throw new app_error_1.AppError('NAMES_FRAME_LIMIT', 'Too many frames.', 400);
        }
        const first = await this.prisma.nameFrame.findFirst({
            orderBy: { sortOrder: 'asc' },
            select: { sortOrder: true },
        });
        const data = (0, names_shared_1.frameWriteData)(dto, (first?.sortOrder ?? 0) - 1);
        try {
            const row = await this.prisma.nameFrame.create({ data });
            await (0, names_shared_1.auditNames)(this.prisma, adminId, 'names.frame.create', `name_frame:${row.id}`, { id: row.id });
            return (0, names_shared_1.mapFrame)(row);
        }
        catch (e) {
            (0, names_shared_1.rethrowUnique)(e, 'NAMES_DUP_FRAME', `Frame id already exists: ${data.id}`);
        }
    }
    async updateFrame(adminId, rawId, dto) {
        (0, names_shared_1.assertFrames)([dto]);
        const id = (0, names_shared_1.sanitizeId)(rawId, 'frame');
        const existing = await this.prisma.nameFrame.findUnique({ where: { id } });
        if (!existing) {
            throw new app_error_1.AppError('NAMES_FRAME_NOT_FOUND', 'Frame not found.', 404);
        }
        const data = (0, names_shared_1.frameWriteData)({ ...dto, id }, existing.sortOrder);
        const row = await this.prisma.nameFrame.update({
            where: { id },
            data: {
                label: data.label,
                prefix: data.prefix,
                suffix: data.suffix,
                premium: data.premium,
                enabled: data.enabled,
            },
        });
        await (0, names_shared_1.auditNames)(this.prisma, adminId, 'names.frame.update', `name_frame:${id}`, { id });
        return (0, names_shared_1.mapFrame)(row);
    }
    async deleteFrame(adminId, rawId) {
        const id = (0, names_shared_1.sanitizeId)(rawId, 'frame');
        const deleted = await this.prisma.nameFrame.deleteMany({ where: { id } });
        if (deleted.count === 0) {
            throw new app_error_1.AppError('NAMES_FRAME_NOT_FOUND', 'Frame not found.', 404);
        }
        await (0, names_shared_1.auditNames)(this.prisma, adminId, 'names.frame.delete', `name_frame:${id}`, { id });
        return { ok: true, id };
    }
    async updateFont(adminId, rawId, dto) {
        (0, names_shared_1.assertFonts)([
            dto,
            ...(await this.otherFonts((0, names_shared_1.sanitizeId)(rawId, 'font'), dto)),
        ]);
        const id = (0, names_shared_1.sanitizeId)(rawId, 'font');
        const existing = await this.prisma.nameFont.findUnique({ where: { id } });
        if (!existing) {
            throw new app_error_1.AppError('NAMES_FONT_NOT_FOUND', 'Font not found.', 404);
        }
        const data = (0, names_shared_1.fontWriteData)({ ...dto, id }, existing.sortOrder);
        const row = await this.prisma.nameFont.update({
            where: { id },
            data: {
                label: data.label,
                sample: data.sample,
                enabled: data.enabled,
            },
        });
        await (0, names_shared_1.auditNames)(this.prisma, adminId, 'names.font.update', `name_font:${id}`, { id, enabled: row.enabled });
        return (0, names_shared_1.mapFont)(row);
    }
    async otherFonts(id, dto) {
        const others = await this.prisma.nameFont.findMany({
            where: { NOT: { id } },
        });
        if (others.length + 1 > names_shared_1.MAX_FONTS) {
            throw new app_error_1.AppError('NAMES_FONT_LIMIT', 'Too many fonts.', 400);
        }
        return others.map((f) => ({
            id: f.id,
            label: f.label,
            sample: f.sample,
            enabled: f.enabled,
        }));
    }
};
exports.NamesAdminItemsService = NamesAdminItemsService;
exports.NamesAdminItemsService = NamesAdminItemsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NamesAdminItemsService);
//# sourceMappingURL=names-admin-items.service.js.map