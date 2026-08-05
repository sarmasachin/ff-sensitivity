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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const app_error_1 = require("../common/errors/app-error");
const prisma_service_1 = require("../prisma/prisma.service");
const settings_service_1 = require("../settings/settings.service");
const staff_security_1 = require("./staff-security");
const BCRYPT_ROUNDS = 12;
let StaffService = class StaffService {
    prisma;
    settings;
    constructor(prisma, settings) {
        this.prisma = prisma;
        this.settings = settings;
    }
    assertCanMutate(actor) {
        if (actor.role === client_1.AdminRole.VIEWER) {
            throw new app_error_1.AppError('FORBIDDEN_ROLE', 'Viewers cannot change staff.', 403);
        }
    }
    assertCanManageTarget(actor, target) {
        if (target.role === client_1.AdminRole.SUPER_ADMIN) {
            throw new app_error_1.AppError('STAFF_PROTECTED', 'Super Admin accounts cannot be changed here.', 403);
        }
        if (target.id === actor.id) {
            throw new app_error_1.AppError('STAFF_SELF', 'You cannot change your own staff account here.', 403);
        }
        if (target.role === client_1.AdminRole.ADMIN &&
            actor.role !== client_1.AdminRole.SUPER_ADMIN) {
            throw new app_error_1.AppError('FORBIDDEN_ROLE', 'Only Super Admin can manage Admin seats.', 403);
        }
    }
    toRow(admin, now = new Date()) {
        const status = (0, staff_security_1.mapStaffStatus)(admin);
        const h = (0, staff_security_1.hoursAgo)(admin.lastLoginAt, now);
        let note = '';
        if (status === 'DISABLED')
            note = 'Account disabled.';
        else if (status === 'INVITED')
            note = 'Awaiting first login.';
        return {
            id: admin.id,
            name: admin.displayName?.trim() || admin.email.split('@')[0] || 'Staff',
            email: admin.email,
            role: admin.role,
            status,
            modules: (0, staff_security_1.mapModulesForUi)(admin.allowedModules),
            lastLoginLabel: (0, staff_security_1.formatWhen)(h),
            invitedAtLabel: (0, staff_security_1.formatDay)(admin.createdAt),
            note,
        };
    }
    async loadRow(id) {
        const admin = await this.prisma.admin.findUnique({ where: { id } });
        if (!admin) {
            throw new app_error_1.AppError('STAFF_NOT_FOUND', 'Staff member not found.', 404);
        }
        return this.toRow(admin);
    }
    async adminList() {
        const rows = await this.prisma.admin.findMany({
            orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
            take: 200,
        });
        const now = new Date();
        return { staff: rows.map((r) => this.toRow(r, now)) };
    }
    async invite(actor, dto) {
        this.assertCanMutate(actor);
        await this.settings.assertStepUp(actor.id, dto.currentPassword, 'staff');
        const name = (0, staff_security_1.sanitizeStaffText)(dto.name, 80);
        const email = (0, staff_security_1.assertStaffEmail)(dto.email);
        const role = (0, staff_security_1.assertInviteRole)(dto.role);
        (0, staff_security_1.assertSafeStaffText)(name, 'Name');
        if (!name) {
            throw new app_error_1.AppError('STAFF_BAD_NAME', 'Name is required.', 400);
        }
        if (role === client_1.AdminRole.ADMIN && actor.role !== client_1.AdminRole.SUPER_ADMIN) {
            throw new app_error_1.AppError('FORBIDDEN_ROLE', 'Only Super Admin can invite Admin seats.', 403);
        }
        let modules = (0, staff_security_1.normalizeModules)(dto.modules);
        if (actor.role !== client_1.AdminRole.SUPER_ADMIN &&
            modules.includes(client_1.AdminModule.staff)) {
            modules = modules.filter((m) => m !== client_1.AdminModule.staff);
            if (modules.length === 0) {
                throw new app_error_1.AppError('STAFF_BAD_MODULES', 'Assign at least one non-staff module.', 400);
            }
        }
        const existing = await this.prisma.admin.findUnique({ where: { email } });
        if (existing) {
            throw new app_error_1.AppError('STAFF_EXISTS', 'An account with this email already exists.', 409);
        }
        const tempPassword = (0, staff_security_1.generateTempPassword)();
        const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);
        try {
            const created = await this.prisma.$transaction(async (tx) => {
                const admin = await tx.admin.create({
                    data: {
                        email,
                        passwordHash,
                        role,
                        allowedModules: modules,
                        displayName: name,
                        isActive: true,
                        mustChangePassword: true,
                    },
                });
                await tx.auditLog.create({
                    data: {
                        actorAdminId: actor.id,
                        action: 'staff:invite',
                        entity: `admin:${admin.id}`,
                        afterJson: { email, role, modules },
                    },
                });
                return admin;
            });
            return {
                staff: this.toRow(created),
                temporaryPassword: tempPassword,
            };
        }
        catch (e) {
            if (e instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                e.code === 'P2002') {
                throw new app_error_1.AppError('STAFF_EXISTS', 'An account with this email already exists.', 409);
            }
            throw e;
        }
    }
    async setModules(actor, idRaw, dto) {
        this.assertCanMutate(actor);
        const id = (0, staff_security_1.assertStaffId)(idRaw);
        const target = await this.prisma.admin.findUnique({ where: { id } });
        if (!target) {
            throw new app_error_1.AppError('STAFF_NOT_FOUND', 'Staff member not found.', 404);
        }
        this.assertCanManageTarget(actor, target);
        const requested = (0, staff_security_1.normalizeModules)(dto.modules);
        const wantsStaff = requested.includes(client_1.AdminModule.staff);
        const hadStaff = target.allowedModules.includes(client_1.AdminModule.staff);
        let modules;
        if (actor.role !== client_1.AdminRole.SUPER_ADMIN) {
            if (wantsStaff && !hadStaff) {
                throw new app_error_1.AppError('FORBIDDEN_ROLE', 'Only Super Admin can grant the staff module.', 403);
            }
            modules = requested.filter((m) => m !== client_1.AdminModule.staff);
            if (hadStaff)
                modules.push(client_1.AdminModule.staff);
            if (modules.length === 0) {
                throw new app_error_1.AppError('STAFF_BAD_MODULES', 'Assign at least one module.', 400);
            }
        }
        else {
            modules = requested;
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.admin.update({
                where: { id },
                data: { allowedModules: modules },
            });
            await tx.auditLog.create({
                data: {
                    actorAdminId: actor.id,
                    action: 'staff:modules',
                    entity: `admin:${id}`,
                    beforeJson: { modules: target.allowedModules },
                    afterJson: { modules },
                },
            });
        });
        return { staff: await this.loadRow(id) };
    }
    async disable(actor, idRaw) {
        this.assertCanMutate(actor);
        const id = (0, staff_security_1.assertStaffId)(idRaw);
        const target = await this.prisma.admin.findUnique({ where: { id } });
        if (!target) {
            throw new app_error_1.AppError('STAFF_NOT_FOUND', 'Staff member not found.', 404);
        }
        this.assertCanManageTarget(actor, target);
        await this.prisma.$transaction(async (tx) => {
            await tx.admin.update({
                where: { id },
                data: { isActive: false },
            });
            await tx.adminSession.updateMany({
                where: { adminId: id, revokedAt: null },
                data: { revokedAt: new Date() },
            });
            await tx.auditLog.create({
                data: {
                    actorAdminId: actor.id,
                    action: 'staff:disable',
                    entity: `admin:${id}`,
                    beforeJson: { isActive: true },
                    afterJson: { isActive: false, sessionsRevoked: true },
                },
            });
        });
        return { staff: await this.loadRow(id) };
    }
    async enable(actor, idRaw) {
        this.assertCanMutate(actor);
        const id = (0, staff_security_1.assertStaffId)(idRaw);
        const target = await this.prisma.admin.findUnique({ where: { id } });
        if (!target) {
            throw new app_error_1.AppError('STAFF_NOT_FOUND', 'Staff member not found.', 404);
        }
        this.assertCanManageTarget(actor, target);
        await this.prisma.$transaction(async (tx) => {
            await tx.admin.update({
                where: { id },
                data: { isActive: true },
            });
            await tx.auditLog.create({
                data: {
                    actorAdminId: actor.id,
                    action: 'staff:enable',
                    entity: `admin:${id}`,
                    beforeJson: { isActive: false },
                    afterJson: { isActive: true },
                },
            });
        });
        return { staff: await this.loadRow(id) };
    }
    async resendInvite(actor, idRaw) {
        this.assertCanMutate(actor);
        const id = (0, staff_security_1.assertStaffId)(idRaw);
        const target = await this.prisma.admin.findUnique({ where: { id } });
        if (!target) {
            throw new app_error_1.AppError('STAFF_NOT_FOUND', 'Staff member not found.', 404);
        }
        this.assertCanManageTarget(actor, target);
        if (!target.isActive || target.lastLoginAt || !target.mustChangePassword) {
            throw new app_error_1.AppError('STAFF_NOT_INVITED', 'Only pending invites can be resent.', 409);
        }
        const tempPassword = (0, staff_security_1.generateTempPassword)();
        const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);
        await this.prisma.$transaction(async (tx) => {
            await tx.admin.update({
                where: { id },
                data: { passwordHash, mustChangePassword: true },
            });
            await tx.adminSession.updateMany({
                where: { adminId: id, revokedAt: null },
                data: { revokedAt: new Date() },
            });
            await tx.auditLog.create({
                data: {
                    actorAdminId: actor.id,
                    action: 'staff:resend_invite',
                    entity: `admin:${id}`,
                    afterJson: { email: target.email },
                },
            });
        });
        return {
            staff: await this.loadRow(id),
            temporaryPassword: tempPassword,
        };
    }
};
exports.StaffService = StaffService;
exports.StaffService = StaffService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        settings_service_1.SettingsService])
], StaffService);
//# sourceMappingURL=staff.service.js.map