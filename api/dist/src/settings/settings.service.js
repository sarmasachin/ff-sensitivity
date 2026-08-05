"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SettingsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcryptjs"));
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const app_error_1 = require("../common/errors/app-error");
const settings_security_1 = require("./settings-security");
const CONFIG_ID = 1;
const PURGE_INTERVAL_MS = 60 * 60 * 1000;
let SettingsService = SettingsService_1 = class SettingsService {
    prisma;
    log = new common_1.Logger(SettingsService_1.name);
    purgeTimer = null;
    constructor(prisma) {
        this.prisma = prisma;
    }
    onModuleInit() {
        this.purgeTimer = setInterval(() => {
            void this.purgeAuditLogs(null, { manual: false }).catch((err) => {
                this.log.warn(`Audit auto-purge failed: ${String(err)}`);
            });
        }, PURGE_INTERVAL_MS);
    }
    onModuleDestroy() {
        if (this.purgeTimer)
            clearInterval(this.purgeTimer);
        this.purgeTimer = null;
    }
    async ensureDefaults() {
        const existing = await this.prisma.opsSettings.findUnique({
            where: { id: CONFIG_ID },
        });
        if (existing)
            return existing;
        const d = settings_security_1.DEFAULT_OPS_SETTINGS;
        try {
            return await this.prisma.opsSettings.create({
                data: {
                    id: CONFIG_ID,
                    preferences: d.preferences,
                    session: d.session,
                    security: d.security,
                },
            });
        }
        catch (e) {
            if (e instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                e.code === 'P2002') {
                const again = await this.prisma.opsSettings.findUnique({
                    where: { id: CONFIG_ID },
                });
                if (again)
                    return again;
            }
            throw e;
        }
    }
    async getBundle() {
        const row = await this.ensureDefaults();
        return (0, settings_security_1.mergeSettingsJson)(row.preferences, row.session, row.security);
    }
    async adminGet() {
        return this.getBundle();
    }
    async adminSave(actorAdminId, raw) {
        const prev = await this.getBundle();
        const bundle = (0, settings_security_1.normalizeSettingsPayload)(raw);
        bundle.security.lastAuditPurgeAt = prev.security.lastAuditPurgeAt;
        await this.ensureDefaults();
        await this.prisma.$transaction(async (tx) => {
            await tx.opsSettings.update({
                where: { id: CONFIG_ID },
                data: {
                    preferences: bundle.preferences,
                    session: bundle.session,
                    security: bundle.security,
                },
            });
            await tx.auditLog.create({
                data: {
                    actorAdminId,
                    action: 'settings.config_save',
                    entity: 'ops_settings',
                    afterJson: {
                        landing: bundle.preferences.defaultLanding,
                        idleMinutes: bundle.session.idleTimeoutMinutes,
                        sessionHours: bundle.session.absoluteSessionHours,
                        singleSession: bundle.session.singleSessionOnly,
                        reauthReveal: bundle.security.requireReauthForReveal,
                        reauthStaff: bundle.security.requireReauthForStaffInvite,
                        reauthWallet: bundle.security.requireReauthForWalletAdjust,
                        viewerCsv: bundle.security.allowViewerCsvExport,
                        auditRetentionDays: bundle.security.auditRetentionDays,
                        auditAutoPurge: bundle.security.auditAutoPurge,
                    },
                },
            });
        });
        return bundle;
    }
    async purgeAuditLogs(actorAdminId, opts) {
        const bundle = await this.getBundle();
        if (!opts.manual && !bundle.security.auditAutoPurge) {
            return {
                deleted: 0,
                skipped: true,
                retentionDays: bundle.security.auditRetentionDays,
                lastAuditPurgeAt: bundle.security.lastAuditPurgeAt,
            };
        }
        const days = bundle.security.auditRetentionDays;
        const cutoff = new Date(Date.now() - days * 86_400_000);
        const result = await this.prisma.auditLog.deleteMany({
            where: { createdAt: { lt: cutoff } },
        });
        const stamped = new Date().toISOString();
        const nextSecurity = {
            ...bundle.security,
            lastAuditPurgeAt: stamped,
        };
        await this.prisma.$transaction(async (tx) => {
            await tx.opsSettings.update({
                where: { id: CONFIG_ID },
                data: { security: nextSecurity },
            });
            await tx.auditLog.create({
                data: {
                    actorAdminId,
                    action: 'settings.audit_purge',
                    entity: 'audit_logs',
                    afterJson: {
                        deleted: result.count,
                        retentionDays: days,
                        cutoff: cutoff.toISOString(),
                        manual: opts.manual,
                    },
                },
            });
        });
        return {
            deleted: result.count,
            skipped: false,
            retentionDays: days,
            lastAuditPurgeAt: stamped,
        };
    }
    async assertStepUp(adminId, currentPassword, kind) {
        const bundle = await this.getBundle();
        const required = kind === 'reveal'
            ? bundle.security.requireReauthForReveal
            : kind === 'staff'
                ? bundle.security.requireReauthForStaffInvite
                : bundle.security.requireReauthForWalletAdjust;
        if (!required)
            return;
        const pwd = (currentPassword ?? '').trim();
        if (pwd.length < 6 || pwd.length > 128) {
            throw new app_error_1.AppError('REAUTH_REQUIRED', 'Confirm your password to continue.', 403);
        }
        const admin = await this.prisma.admin.findUnique({
            where: { id: adminId },
            select: { passwordHash: true, isActive: true },
        });
        if (!admin?.isActive) {
            throw new app_error_1.AppError('AUTH_INVALID', 'Invalid or inactive account.', 401);
        }
        const ok = await bcrypt.compare(pwd, admin.passwordHash);
        if (!ok) {
            throw new app_error_1.AppError('REAUTH_INVALID', 'Password confirmation failed.', 403);
        }
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = SettingsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SettingsService);
//# sourceMappingURL=settings.service.js.map