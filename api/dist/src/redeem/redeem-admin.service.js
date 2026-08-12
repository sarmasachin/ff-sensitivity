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
exports.RedeemAdminService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_error_1 = require("../common/errors/app-error");
const prisma_service_1 = require("../prisma/prisma.service");
const settings_service_1 = require("../settings/settings.service");
const redeem_mask_1 = require("./redeem-mask");
const redeem_admin_security_1 = require("./redeem-admin.security");
let RedeemAdminService = class RedeemAdminService {
    prisma;
    settings;
    constructor(prisma, settings) {
        this.prisma = prisma;
        this.settings = settings;
    }
    async list() {
        const rows = await this.prisma.redeemCode.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return { codes: rows.map((row) => this.toListRow(row)) };
    }
    async create(adminId, dto) {
        const data = this.parseWrite(dto, true);
        try {
            const row = await this.prisma.redeemCode.create({ data });
            await this.audit(adminId, 'redeem.create', row.id, {
                title: row.title,
                status: row.status,
            });
            return this.toListRow(row);
        }
        catch (err) {
            this.rethrowUnique(err);
            throw err;
        }
    }
    async update(adminId, id, dto) {
        const codeId = (0, redeem_admin_security_1.assertRedeemAdminId)(id);
        const existing = await this.prisma.redeemCode.findUnique({
            where: { id: codeId },
        });
        if (!existing) {
            throw new app_error_1.AppError('REDEEM_NOT_FOUND', 'Code not found.', 404);
        }
        const data = this.parseWrite(dto, false);
        try {
            const row = await this.prisma.redeemCode.update({
                where: { id: codeId },
                data,
            });
            await this.audit(adminId, 'redeem.update', row.id, {
                title: row.title,
                status: row.status,
            });
            return this.toListRow(row);
        }
        catch (err) {
            this.rethrowUnique(err);
            throw err;
        }
    }
    async remove(adminId, id) {
        const codeId = (0, redeem_admin_security_1.assertRedeemAdminId)(id);
        const existing = await this.prisma.redeemCode.findUnique({
            where: { id: codeId },
            select: { id: true, title: true },
        });
        if (!existing) {
            throw new app_error_1.AppError('REDEEM_NOT_FOUND', 'Code not found.', 404);
        }
        await this.prisma.redeemCode.delete({ where: { id: codeId } });
        await this.audit(adminId, 'redeem.delete', codeId, {
            title: existing.title,
        });
        return { ok: true, id: codeId };
    }
    async reveal(adminId, id, currentPassword) {
        const codeId = (0, redeem_admin_security_1.assertRedeemAdminId)(id);
        await this.settings.assertStepUp(adminId, currentPassword, 'reveal');
        const row = await this.prisma.redeemCode.findUnique({
            where: { id: codeId },
        });
        if (!row) {
            throw new app_error_1.AppError('REDEEM_NOT_FOUND', 'Code not found.', 404);
        }
        await this.audit(adminId, 'redeem.reveal', row.id, { title: row.title });
        return {
            id: row.id,
            title: row.title,
            codeMasked: (0, redeem_mask_1.maskRedeemCode)(row.codeSecret),
            code: row.codeSecret,
        };
    }
    parseWrite(dto, create) {
        const title = dto.title != null ? (0, redeem_admin_security_1.sanitizeRedeemText)(dto.title, 80) : '';
        if (create && !title) {
            throw new app_error_1.AppError('REDEEM_BAD_TITLE', 'Title is required.', 400);
        }
        const valueLabel = dto.valueLabel != null ? (0, redeem_admin_security_1.sanitizeRedeemText)(dto.valueLabel, 40) : '';
        if (create && !valueLabel) {
            throw new app_error_1.AppError('REDEEM_BAD_VALUE', 'Value is required.', 400);
        }
        const data = {};
        if (dto.title != null)
            data.title = title;
        if (dto.type != null)
            data.type = (0, redeem_admin_security_1.assertRedeemType)(dto.type);
        if (dto.valueLabel != null)
            data.valueLabel = valueLabel;
        if (dto.codeSecret != null && dto.codeSecret.trim()) {
            data.codeSecret = (0, redeem_admin_security_1.assertCodeSecret)(dto.codeSecret);
        }
        else if (create) {
            throw new app_error_1.AppError('REDEEM_BAD_SECRET', 'Code is required.', 400);
        }
        if (dto.status != null)
            data.status = (0, redeem_admin_security_1.assertRedeemStatus)(dto.status);
        if (dto.cadence != null)
            data.cadence = (0, redeem_admin_security_1.assertRedeemCadence)(dto.cadence);
        if (dto.stockLeft != null)
            data.stockLeft = (0, redeem_admin_security_1.assertStockLeft)(dto.stockLeft);
        if (create && dto.stockLeft == null)
            data.stockLeft = 1;
        if (dto.coinCost !== undefined) {
            data.coinCost =
                dto.coinCost == null ? null : Math.max(0, Math.floor(dto.coinCost));
        }
        if (dto.expiresLabel != null) {
            data.expiresLabel =
                (0, redeem_admin_security_1.sanitizeRedeemText)(dto.expiresLabel, 40) || 'No expiry';
        }
        else if (create) {
            data.expiresLabel = 'No expiry';
        }
        if (dto.tip != null) {
            data.tip = (0, redeem_admin_security_1.sanitizeRedeemText)(dto.tip, 120) || 'First Come, First Serve!';
        }
        if (dto.redeemUrl != null) {
            data.redeemUrl =
                (0, redeem_admin_security_1.sanitizeRedeemText)(dto.redeemUrl, 200) ||
                    'https://play.google.com/redeem';
        }
        else if (create) {
            data.redeemUrl = 'https://play.google.com/redeem';
        }
        if (create && !data.status)
            data.status = client_1.RedeemCodeStatus.ACTIVE;
        return data;
    }
    toListRow(row) {
        return {
            id: row.id,
            title: row.title,
            type: row.type,
            valueLabel: row.valueLabel,
            codeSecret: '',
            codeMasked: (0, redeem_mask_1.maskRedeemCode)(row.codeSecret),
            status: row.status,
            cadence: row.cadence,
            stockLeft: row.stockLeft,
            coinCost: row.coinCost,
            expiresLabel: row.expiresLabel,
            tip: row.tip,
            redeemUrl: row.redeemUrl,
        };
    }
    rethrowUnique(err) {
        if (err instanceof client_1.Prisma.PrismaClientKnownRequestError &&
            err.code === 'P2002') {
            throw new app_error_1.AppError('REDEEM_SECRET_TAKEN', 'That code secret is already in inventory.', 409);
        }
    }
    async audit(adminId, action, entityId, afterJson) {
        await this.prisma.auditLog.create({
            data: {
                actorAdminId: adminId,
                action,
                entity: `redeem_code:${entityId}`,
                afterJson: afterJson,
            },
        });
    }
};
exports.RedeemAdminService = RedeemAdminService;
exports.RedeemAdminService = RedeemAdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        settings_service_1.SettingsService])
], RedeemAdminService);
//# sourceMappingURL=redeem-admin.service.js.map