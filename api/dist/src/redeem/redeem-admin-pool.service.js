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
exports.RedeemAdminPoolService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_error_1 = require("../common/errors/app-error");
const prisma_service_1 = require("../prisma/prisma.service");
const redeem_scratch_service_1 = require("./redeem-scratch.service");
const redeem_admin_defs_service_1 = require("./redeem-admin-defs.service");
const redeem_admin_security_1 = require("./redeem-admin.security");
let RedeemAdminPoolService = class RedeemAdminPoolService {
    prisma;
    defs;
    constructor(prisma, defs) {
        this.prisma = prisma;
        this.defs = defs;
    }
    async createScratchReward(adminId, dto) {
        const title = (0, redeem_admin_security_1.sanitizeRedeemText)(dto.title, 80);
        if (!title) {
            throw new app_error_1.AppError('REDEEM_BAD_TITLE', 'Title is required.', 400);
        }
        const valueLabel = (0, redeem_admin_security_1.sanitizeRedeemText)(dto.valueLabel, 40);
        if (!valueLabel) {
            throw new app_error_1.AppError('REDEEM_BAD_VALUE', 'Value is required.', 400);
        }
        const pool = this.normalizePool(dto.codePool);
        if (!pool.length) {
            throw new app_error_1.AppError('REDEEM_BAD_POOL', 'Paste at least one unique code for the pool.', 400);
        }
        const min = dto.coinRewardMin ?? 5;
        const max = dto.coinRewardMax ?? 20;
        if (max < min) {
            throw new app_error_1.AppError('REDEEM_BAD_COIN_RANGE', 'Max coins must be greater than or equal to min coins.', 400);
        }
        const tip = (0, redeem_admin_security_1.sanitizeRedeemText)(dto.tip ?? '', 120) || redeem_scratch_service_1.RedeemScratchService.SAFE_TIP;
        const sentinel = `POOL:${Date.now().toString(36)}:${Math.random()
            .toString(36)
            .slice(2, 10)}`.toUpperCase();
        const type = await this.defs.requireType(dto.type);
        const cadence = await this.defs.requireCadence(dto.cadence);
        const row = await this.prisma.$transaction(async (tx) => {
            return tx.redeemCode.create({
                data: {
                    title,
                    type,
                    valueLabel,
                    codeSecret: sentinel,
                    status: (0, redeem_admin_security_1.assertRedeemStatus)(dto.status),
                    cadence,
                    mode: client_1.RedeemMode.SCRATCH_REWARD,
                    stockLeft: pool.length,
                    coinCost: null,
                    coinRewardMin: min,
                    coinRewardMax: max,
                    startsAt: dto.startsAt ? new Date(dto.startsAt) : new Date(),
                    endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
                    windowMinutes: Math.max(5, Math.min(240, dto.windowMinutes ?? 30)),
                    codesPerWindow: Math.max(1, Math.min(20, dto.codesPerWindow ?? 1)),
                    expiresLabel: (0, redeem_admin_security_1.sanitizeRedeemText)(dto.expiresLabel ?? '', 40) || 'Schedule',
                    tip,
                    redeemUrl: (0, redeem_admin_security_1.sanitizeRedeemText)(dto.redeemUrl ?? '', 200) ||
                        'https://play.google.com/redeem',
                    secrets: {
                        create: pool.map((codeSecret) => ({ codeSecret })),
                    },
                },
            });
        });
        await this.prisma.auditLog.create({
            data: {
                actorAdminId: adminId,
                action: 'redeem.create',
                entity: `redeem_code:${row.id}`,
                afterJson: {
                    title: row.title,
                    status: row.status,
                    mode: row.mode,
                    poolSize: pool.length,
                },
            },
        });
        return { row, poolSize: pool.length };
    }
    async appendSecrets(redeemCodeId, raw) {
        const pool = this.normalizePool(raw);
        if (!pool.length) {
            throw new app_error_1.AppError('REDEEM_BAD_POOL', 'Paste at least one unique code to append.', 400);
        }
        let added = 0;
        for (const codeSecret of pool) {
            try {
                await this.prisma.redeemCodeSecret.create({
                    data: { redeemCodeId, codeSecret },
                });
                added += 1;
            }
            catch (err) {
                if (err instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                    err.code === 'P2002') {
                    continue;
                }
                throw err;
            }
        }
        if (added === 0) {
            throw new app_error_1.AppError('REDEEM_SECRET_TAKEN', 'Those codes are already in inventory.', 409);
        }
        return added;
    }
    async unusedPoolCount(redeemCodeId) {
        return this.prisma.redeemCodeSecret.count({
            where: { redeemCodeId, status: client_1.RedeemSecretStatus.UNUSED },
        });
    }
    normalizePool(raw) {
        const out = [];
        const seen = new Set();
        for (const line of raw ?? []) {
            try {
                const secret = (0, redeem_admin_security_1.assertCodeSecret)(String(line));
                if (seen.has(secret))
                    continue;
                seen.add(secret);
                out.push(secret);
            }
            catch {
            }
        }
        return out;
    }
};
exports.RedeemAdminPoolService = RedeemAdminPoolService;
exports.RedeemAdminPoolService = RedeemAdminPoolService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redeem_admin_defs_service_1.RedeemAdminDefsService])
], RedeemAdminPoolService);
//# sourceMappingURL=redeem-admin-pool.service.js.map