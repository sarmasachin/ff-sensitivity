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
const redeem_admin_pool_service_1 = require("./redeem-admin-pool.service");
const redeem_admin_defs_service_1 = require("./redeem-admin-defs.service");
const redeem_admin_security_1 = require("./redeem-admin.security");
let RedeemAdminService = class RedeemAdminService {
    prisma;
    settings;
    pool;
    defs;
    constructor(prisma, settings, pool, defs) {
        this.prisma = prisma;
        this.settings = settings;
        this.pool = pool;
        this.defs = defs;
    }
    async list() {
        const [rows, types, cadences] = await Promise.all([
            this.prisma.redeemCode.findMany({
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: {
                            secrets: { where: { status: client_1.RedeemSecretStatus.UNUSED } },
                        },
                    },
                },
            }),
            this.prisma.redeemTypeDef.findMany({
                orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            }),
            this.prisma.redeemCadenceDef.findMany({
                orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            }),
        ]);
        return {
            codes: rows.map((row) => this.toListRow(row, row._count.secrets)),
            types,
            cadences,
        };
    }
    async create(adminId, dto) {
        const mode = dto.mode ?? client_1.RedeemMode.SINGLE;
        if (mode === client_1.RedeemMode.SCRATCH_REWARD) {
            try {
                const { row, poolSize } = await this.pool.createScratchReward(adminId, dto);
                return this.toListRow(row, poolSize);
            }
            catch (err) {
                this.rethrowUnique(err);
                throw err;
            }
        }
        const data = (await this.parseWrite(dto, true));
        data.mode = client_1.RedeemMode.SINGLE;
        try {
            const row = await this.prisma.redeemCode.create({ data });
            await this.audit(adminId, 'redeem.create', row.id, {
                title: row.title,
                status: row.status,
                mode: row.mode,
            });
            return this.toListRow(row, null);
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
        const data = (await this.parseWrite(dto, false));
        if (existing.mode === client_1.RedeemMode.SCRATCH_REWARD) {
            if (dto.coinRewardMin != null)
                data.coinRewardMin = dto.coinRewardMin;
            if (dto.coinRewardMax != null)
                data.coinRewardMax = dto.coinRewardMax;
            if (dto.windowMinutes != null) {
                data.windowMinutes = Math.max(5, Math.min(240, dto.windowMinutes));
            }
            if (dto.codesPerWindow != null) {
                data.codesPerWindow = Math.max(1, Math.min(20, dto.codesPerWindow));
            }
            if (dto.startsAt !== undefined) {
                data.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
            }
            if (dto.endsAt !== undefined) {
                data.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
            }
            if (dto.codePool?.length) {
                await this.pool.appendSecrets(codeId, dto.codePool);
            }
        }
        try {
            const row = await this.prisma.redeemCode.update({
                where: { id: codeId },
                data,
            });
            const poolLeft = row.mode === client_1.RedeemMode.SCRATCH_REWARD
                ? await this.pool.unusedPoolCount(codeId)
                : null;
            if (poolLeft != null && row.stockLeft !== poolLeft) {
                await this.prisma.redeemCode.update({
                    where: { id: codeId },
                    data: { stockLeft: poolLeft },
                });
                row.stockLeft = poolLeft;
            }
            await this.audit(adminId, 'redeem.update', row.id, {
                title: row.title,
                status: row.status,
                mode: row.mode,
            });
            return this.toListRow(row, poolLeft);
        }
        catch (err) {
            this.rethrowUnique(err);
            throw err;
        }
    }
    async appendPool(adminId, id, dto) {
        const codeId = (0, redeem_admin_security_1.assertRedeemAdminId)(id);
        const existing = await this.prisma.redeemCode.findUnique({
            where: { id: codeId },
        });
        if (!existing) {
            throw new app_error_1.AppError('REDEEM_NOT_FOUND', 'Code not found.', 404);
        }
        if (existing.mode !== client_1.RedeemMode.SCRATCH_REWARD) {
            throw new app_error_1.AppError('REDEEM_WRONG_MODE', 'Only scratch-reward cards accept a code pool.', 409);
        }
        const added = await this.pool.appendSecrets(codeId, dto.codePool ?? []);
        const poolLeft = await this.pool.unusedPoolCount(codeId);
        await this.prisma.redeemCode.update({
            where: { id: codeId },
            data: { stockLeft: poolLeft },
        });
        await this.audit(adminId, 'redeem.pool_append', codeId, {
            added,
            poolLeft,
        });
        const row = await this.prisma.redeemCode.findUniqueOrThrow({
            where: { id: codeId },
        });
        return { ...this.toListRow(row, poolLeft), added };
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
            include: {
                secrets: {
                    where: { status: client_1.RedeemSecretStatus.UNUSED },
                    orderBy: { createdAt: 'asc' },
                    take: 5,
                },
            },
        });
        if (!row) {
            throw new app_error_1.AppError('REDEEM_NOT_FOUND', 'Code not found.', 404);
        }
        await this.audit(adminId, 'redeem.reveal', row.id, { title: row.title });
        if (row.mode === client_1.RedeemMode.SCRATCH_REWARD) {
            return {
                id: row.id,
                title: row.title,
                mode: row.mode,
                codeMasked: 'POOL',
                code: null,
                unusedPreview: row.secrets.map((s) => ({
                    id: s.id,
                    codeMasked: (0, redeem_mask_1.maskRedeemCode)(s.codeSecret),
                    code: s.codeSecret,
                })),
            };
        }
        return {
            id: row.id,
            title: row.title,
            mode: row.mode,
            codeMasked: (0, redeem_mask_1.maskRedeemCode)(row.codeSecret),
            code: row.codeSecret,
            unusedPreview: [],
        };
    }
    async parseWrite(dto, create) {
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
            data.type = await this.defs.requireType(dto.type);
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
        if (dto.cadence != null) {
            data.cadence = await this.defs.requireCadence(dto.cadence);
        }
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
    toListRow(row, poolLeft) {
        const mode = row.mode ?? client_1.RedeemMode.SINGLE;
        return {
            id: row.id,
            title: row.title,
            type: row.type,
            valueLabel: row.valueLabel,
            codeSecret: '',
            codeMasked: mode === client_1.RedeemMode.SCRATCH_REWARD
                ? 'POOL'
                : (0, redeem_mask_1.maskRedeemCode)(row.codeSecret),
            status: row.status,
            cadence: row.cadence,
            mode,
            stockLeft: poolLeft ?? row.stockLeft,
            poolLeft,
            coinCost: row.coinCost,
            coinRewardMin: row.coinRewardMin ?? null,
            coinRewardMax: row.coinRewardMax ?? null,
            startsAt: row.startsAt?.toISOString() ?? null,
            endsAt: row.endsAt?.toISOString() ?? null,
            windowMinutes: row.windowMinutes ?? 30,
            codesPerWindow: row.codesPerWindow ?? 1,
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
        settings_service_1.SettingsService,
        redeem_admin_pool_service_1.RedeemAdminPoolService,
        redeem_admin_defs_service_1.RedeemAdminDefsService])
], RedeemAdminService);
//# sourceMappingURL=redeem-admin.service.js.map