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
exports.RedeemAdminDefsService = void 0;
const common_1 = require("@nestjs/common");
const app_error_1 = require("../common/errors/app-error");
const prisma_service_1 = require("../prisma/prisma.service");
const redeem_admin_security_1 = require("./redeem-admin.security");
let RedeemAdminDefsService = class RedeemAdminDefsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listTypes() {
        const rows = await this.prisma.redeemTypeDef.findMany({
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        });
        return { types: rows };
    }
    async listCadences() {
        const rows = await this.prisma.redeemCadenceDef.findMany({
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        });
        return { cadences: rows };
    }
    async requireType(raw, opts) {
        const id = (0, redeem_admin_security_1.assertRedeemDefId)(raw);
        const row = await this.prisma.redeemTypeDef.findUnique({ where: { id } });
        if (!row) {
            throw new app_error_1.AppError('REDEEM_BAD_TYPE', 'Unknown redeem type.', 400);
        }
        if (opts?.mustBeEnabled !== false && !row.enabled) {
            throw new app_error_1.AppError('REDEEM_BAD_TYPE', 'Redeem type is disabled.', 400);
        }
        return id;
    }
    async requireCadence(raw, opts) {
        const id = (0, redeem_admin_security_1.assertRedeemDefId)(raw);
        const row = await this.prisma.redeemCadenceDef.findUnique({
            where: { id },
        });
        if (!row) {
            throw new app_error_1.AppError('REDEEM_BAD_CADENCE', 'Unknown cadence.', 400);
        }
        if (opts?.mustBeEnabled !== false && !row.enabled) {
            throw new app_error_1.AppError('REDEEM_BAD_CADENCE', 'Cadence is disabled.', 400);
        }
        return id;
    }
    async createType(adminId, dto) {
        const id = (0, redeem_admin_security_1.assertRedeemDefId)(dto.id);
        const label = (0, redeem_admin_security_1.sanitizeRedeemText)(dto.label, 40);
        if (!label) {
            throw new app_error_1.AppError('REDEEM_BAD_LABEL', 'Label is required.', 400);
        }
        const existing = await this.prisma.redeemTypeDef.findUnique({
            where: { id },
        });
        if (existing) {
            throw new app_error_1.AppError('REDEEM_TYPE_TAKEN', 'Type id already exists.', 409);
        }
        const row = await this.prisma.redeemTypeDef.create({
            data: {
                id,
                label,
                sortOrder: (0, redeem_admin_security_1.assertSortOrder)(dto.sortOrder, 0),
                enabled: dto.enabled ?? true,
            },
        });
        await this.audit(adminId, 'redeem.type.create', id, { label: row.label });
        return row;
    }
    async updateType(adminId, idRaw, dto) {
        const id = (0, redeem_admin_security_1.assertRedeemDefId)(idRaw);
        const existing = await this.prisma.redeemTypeDef.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new app_error_1.AppError('REDEEM_TYPE_NOT_FOUND', 'Type not found.', 404);
        }
        const data = {};
        if (dto.label != null)
            data.label = (0, redeem_admin_security_1.sanitizeRedeemText)(dto.label, 40);
        if (dto.sortOrder != null)
            data.sortOrder = (0, redeem_admin_security_1.assertSortOrder)(dto.sortOrder);
        if (dto.enabled != null)
            data.enabled = dto.enabled;
        const row = await this.prisma.redeemTypeDef.update({ where: { id }, data });
        await this.audit(adminId, 'redeem.type.update', id, { label: row.label });
        return row;
    }
    async removeType(adminId, idRaw) {
        const id = (0, redeem_admin_security_1.assertRedeemDefId)(idRaw);
        const existing = await this.prisma.redeemTypeDef.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new app_error_1.AppError('REDEEM_TYPE_NOT_FOUND', 'Type not found.', 404);
        }
        const used = await this.prisma.redeemCode.count({ where: { type: id } });
        if (used > 0) {
            throw new app_error_1.AppError('REDEEM_TYPE_IN_USE', `Type is used by ${used} code(s). Change those first.`, 409);
        }
        await this.prisma.redeemTypeDef.delete({ where: { id } });
        await this.audit(adminId, 'redeem.type.delete', id, {
            label: existing.label,
        });
        return { ok: true, id };
    }
    async createCadence(adminId, dto) {
        const id = (0, redeem_admin_security_1.assertRedeemDefId)(dto.id);
        const label = (0, redeem_admin_security_1.sanitizeRedeemText)(dto.label, 40);
        if (!label) {
            throw new app_error_1.AppError('REDEEM_BAD_LABEL', 'Label is required.', 400);
        }
        const existing = await this.prisma.redeemCadenceDef.findUnique({
            where: { id },
        });
        if (existing) {
            throw new app_error_1.AppError('REDEEM_CADENCE_TAKEN', 'Cadence id already exists.', 409);
        }
        const row = await this.prisma.redeemCadenceDef.create({
            data: {
                id,
                label,
                claimLimit: (0, redeem_admin_security_1.assertClaimLimit)(dto.claimLimit, 3),
                windowHours: (0, redeem_admin_security_1.assertWindowHours)(dto.windowHours, 24),
                sortOrder: (0, redeem_admin_security_1.assertSortOrder)(dto.sortOrder, 0),
                enabled: dto.enabled ?? true,
            },
        });
        await this.audit(adminId, 'redeem.cadence.create', id, {
            label: row.label,
        });
        return row;
    }
    async updateCadence(adminId, idRaw, dto) {
        const id = (0, redeem_admin_security_1.assertRedeemDefId)(idRaw);
        const existing = await this.prisma.redeemCadenceDef.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new app_error_1.AppError('REDEEM_CADENCE_NOT_FOUND', 'Cadence not found.', 404);
        }
        const data = {};
        if (dto.label != null)
            data.label = (0, redeem_admin_security_1.sanitizeRedeemText)(dto.label, 40);
        if (dto.claimLimit != null) {
            data.claimLimit = (0, redeem_admin_security_1.assertClaimLimit)(dto.claimLimit);
        }
        if (dto.windowHours != null) {
            data.windowHours = (0, redeem_admin_security_1.assertWindowHours)(dto.windowHours);
        }
        if (dto.sortOrder != null)
            data.sortOrder = (0, redeem_admin_security_1.assertSortOrder)(dto.sortOrder);
        if (dto.enabled != null)
            data.enabled = dto.enabled;
        const row = await this.prisma.redeemCadenceDef.update({
            where: { id },
            data,
        });
        await this.audit(adminId, 'redeem.cadence.update', id, {
            label: row.label,
        });
        return row;
    }
    async removeCadence(adminId, idRaw) {
        const id = (0, redeem_admin_security_1.assertRedeemDefId)(idRaw);
        const existing = await this.prisma.redeemCadenceDef.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new app_error_1.AppError('REDEEM_CADENCE_NOT_FOUND', 'Cadence not found.', 404);
        }
        const used = await this.prisma.redeemCode.count({ where: { cadence: id } });
        if (used > 0) {
            throw new app_error_1.AppError('REDEEM_CADENCE_IN_USE', `Cadence is used by ${used} code(s). Change those first.`, 409);
        }
        await this.prisma.redeemCadenceDef.delete({ where: { id } });
        await this.audit(adminId, 'redeem.cadence.delete', id, {
            label: existing.label,
        });
        return { ok: true, id };
    }
    async audit(adminId, action, id, after) {
        await this.prisma.auditLog.create({
            data: {
                actorAdminId: adminId,
                action,
                entity: `redeem_def:${id}`,
                afterJson: after,
            },
        });
    }
};
exports.RedeemAdminDefsService = RedeemAdminDefsService;
exports.RedeemAdminDefsService = RedeemAdminDefsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RedeemAdminDefsService);
//# sourceMappingURL=redeem-admin-defs.service.js.map