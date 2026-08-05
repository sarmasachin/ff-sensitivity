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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const app_error_1 = require("../common/errors/app-error");
const prisma_service_1 = require("../prisma/prisma.service");
const users_security_1 = require("./users-security");
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    assertCanMutate(admin) {
        if (admin.role === client_1.AdminRole.VIEWER) {
            throw new app_error_1.AppError('FORBIDDEN_ROLE', 'Viewers cannot change users.', 403);
        }
    }
    toUserRow(user, now = new Date()) {
        const install = user.deviceInstalls[0];
        const activityAt = install?.lastSeenAt &&
            (!user.lastLoginAt || install.lastSeenAt > user.lastLoginAt)
            ? install.lastSeenAt
            : (user.lastLoginAt ?? user.createdAt);
        const h = (0, users_security_1.hoursAgo)(activityAt, now);
        const deviceLabel = install
            ? [install.model || install.brand || 'Device', install.androidVersion]
                .filter(Boolean)
                .join(' · ')
            : '—';
        return {
            id: user.id,
            displayName: user.displayName || 'Player',
            email: (0, users_security_1.maskEmail)(user.email),
            googleSubMasked: (0, users_security_1.maskGoogleSub)(user.googleSub),
            status: (0, users_security_1.mapAccountStatus)(user.isActive, user.isRestricted),
            joinedLabel: (0, users_security_1.formatJoined)(user.createdAt),
            lastActiveLabel: (0, users_security_1.formatWhen)(h),
            lastActiveHoursAgo: Math.round(h * 10) / 10,
            deviceId: install?.installId ?? '—',
            deviceLabel,
            appVersion: install?.appVersion || '—',
            coinBalance: user.coins,
            claimsCount: user._count.claims,
            redeemUnlocks: user._count.claims,
            regionLabel: '—',
            note: user.accountNote,
        };
    }
    async loadRow(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                displayName: true,
                googleSub: true,
                coins: true,
                isActive: true,
                isRestricted: true,
                accountNote: true,
                createdAt: true,
                lastLoginAt: true,
                _count: { select: { claims: true } },
                deviceInstalls: {
                    orderBy: { lastSeenAt: 'desc' },
                    take: 1,
                    select: {
                        installId: true,
                        brand: true,
                        model: true,
                        androidVersion: true,
                        appVersion: true,
                        lastSeenAt: true,
                    },
                },
            },
        });
        if (!user) {
            throw new app_error_1.AppError('USER_NOT_FOUND', 'User not found.', 404);
        }
        return this.toUserRow(user);
    }
    async adminListUsers() {
        const users = await this.prisma.user.findMany({
            orderBy: { updatedAt: 'desc' },
            take: 500,
            select: {
                id: true,
                email: true,
                displayName: true,
                googleSub: true,
                coins: true,
                isActive: true,
                isRestricted: true,
                accountNote: true,
                createdAt: true,
                lastLoginAt: true,
                _count: { select: { claims: true } },
                deviceInstalls: {
                    orderBy: { lastSeenAt: 'desc' },
                    take: 1,
                    select: {
                        installId: true,
                        brand: true,
                        model: true,
                        androidVersion: true,
                        appVersion: true,
                        lastSeenAt: true,
                    },
                },
            },
        });
        const now = new Date();
        return { users: users.map((u) => this.toUserRow(u, now)) };
    }
    async adminSetStatus(admin, userIdRaw, dto) {
        this.assertCanMutate(admin);
        const userId = (0, users_security_1.assertUserId)(userIdRaw);
        const note = (0, users_security_1.sanitizeUserText)(dto.note ?? '', 400);
        if (note)
            (0, users_security_1.assertSafeUserText)(note, 'Note');
        const before = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!before) {
            throw new app_error_1.AppError('USER_NOT_FOUND', 'User not found.', 404);
        }
        let data;
        if (dto.action === 'suspend') {
            data = {
                isActive: false,
                isRestricted: false,
                tokenVersion: { increment: 1 },
            };
        }
        else if (dto.action === 'restrict') {
            if (!before.isActive) {
                throw new app_error_1.AppError('USER_STATUS_CONFLICT', 'Restore the account before restricting.', 409);
            }
            data = { isActive: true, isRestricted: true };
        }
        else {
            data = { isActive: true, isRestricted: false };
        }
        if (note)
            data.accountNote = note;
        const after = await this.prisma.$transaction(async (tx) => {
            const updated = await tx.user.update({
                where: { id: userId },
                data,
            });
            await tx.auditLog.create({
                data: {
                    actorAdminId: admin.id,
                    action: `user:${dto.action}`,
                    entity: `user:${userId}`,
                    beforeJson: {
                        isActive: before.isActive,
                        isRestricted: before.isRestricted,
                    },
                    afterJson: {
                        isActive: updated.isActive,
                        isRestricted: updated.isRestricted,
                    },
                },
            });
            return updated;
        });
        return { user: await this.loadRow(after.id) };
    }
    async adminSetNote(admin, userIdRaw, dto) {
        this.assertCanMutate(admin);
        const userId = (0, users_security_1.assertUserId)(userIdRaw);
        const note = (0, users_security_1.sanitizeUserText)(dto.note, 400);
        (0, users_security_1.assertSafeUserText)(note, 'Note');
        const before = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!before) {
            throw new app_error_1.AppError('USER_NOT_FOUND', 'User not found.', 404);
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: userId },
                data: { accountNote: note },
            });
            await tx.auditLog.create({
                data: {
                    actorAdminId: admin.id,
                    action: 'user:note',
                    entity: `user:${userId}`,
                    beforeJson: { note: before.accountNote },
                    afterJson: { note },
                },
            });
        });
        return { user: await this.loadRow(userId) };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map