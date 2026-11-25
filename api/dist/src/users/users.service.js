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
const users_row_1 = require("./users-row");
const users_stats_1 = require("./users-stats");
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
    async attachSharedInstalls(users) {
        const missing = users.filter((u) => u.deviceInstalls.length === 0);
        if (missing.length === 0)
            return users;
        const tokens = await this.prisma.devicePushToken.findMany({
            where: {
                userId: { in: missing.map((u) => u.id) },
                installId: { not: null },
            },
            orderBy: { lastSeenAt: 'desc' },
            select: { userId: true, installId: true },
        });
        const installIdByUser = new Map();
        for (const row of tokens) {
            if (row.installId && !installIdByUser.has(row.userId)) {
                installIdByUser.set(row.userId, row.installId);
            }
        }
        if (installIdByUser.size === 0)
            return users;
        const extras = await this.prisma.deviceInstall.findMany({
            where: { installId: { in: [...new Set(installIdByUser.values())] } },
            select: users_row_1.installSelect,
        });
        const byInstall = new Map(extras.map((row) => [row.installId, row]));
        return users.map((user) => {
            if (user.deviceInstalls.length > 0)
                return user;
            const installId = installIdByUser.get(user.id);
            const shared = installId ? byInstall.get(installId) : undefined;
            return shared ? { ...user, deviceInstalls: [shared] } : user;
        });
    }
    async loadRow(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: users_row_1.userListSelect,
        });
        if (!user) {
            throw new app_error_1.AppError('USER_NOT_FOUND', 'User not found.', 404);
        }
        const [resolved] = await this.attachSharedInstalls([user]);
        return (0, users_row_1.toUserRow)(resolved);
    }
    async adminListUsers() {
        const [users, stats] = await Promise.all([
            this.prisma.user.findMany({
                orderBy: { updatedAt: 'desc' },
                select: users_row_1.userListSelect,
            }),
            (0, users_stats_1.countUserDeskStats)(this.prisma),
        ]);
        const now = new Date();
        const resolved = await this.attachSharedInstalls(users);
        return { users: resolved.map((u) => (0, users_row_1.toUserRow)(u, now)), stats };
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
        if (before.googleBanned) {
            throw new app_error_1.AppError('USER_STATUS_CONFLICT', 'This Gmail is banned after data delete. Cannot restore.', 409);
        }
        if (before.dataDeletedAt) {
            throw new app_error_1.AppError('USER_STATUS_CONFLICT', 'This account was deleted by the user. They can sign in again with the same Google account.', 409);
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
            const changed = await tx.user.updateMany({
                where: { id: userId, dataDeletedAt: null },
                data,
            });
            if (changed.count !== 1) {
                throw new app_error_1.AppError('USER_STATUS_CONFLICT', 'This Gmail is banned after data delete. Cannot restore.', 409);
            }
            const updated = await tx.user.findUnique({ where: { id: userId } });
            if (!updated) {
                throw new app_error_1.AppError('USER_NOT_FOUND', 'User not found.', 404);
            }
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
    async adminDeleteData(admin, userIdRaw) {
        this.assertCanMutate(admin);
        const userId = (0, users_security_1.assertUserId)(userIdRaw);
        const before = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!before) {
            throw new app_error_1.AppError('USER_NOT_FOUND', 'User not found.', 404);
        }
        if (before.dataDeletedAt) {
            throw new app_error_1.AppError('USER_STATUS_CONFLICT', 'App data for this Gmail is already deleted.', 409);
        }
        if (before.isActive) {
            throw new app_error_1.AppError('USER_STATUS_CONFLICT', 'Suspend the account before deleting data.', 409);
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.communityPostReport.deleteMany({ where: { userId } });
            await tx.communityPost.deleteMany({ where: { userId } });
            await tx.redeemClaim.deleteMany({ where: { userId } });
            await tx.redeemCodeVote.deleteMany({ where: { userId } });
            await tx.redeemCodeComment.deleteMany({ where: { userId } });
            await tx.redeemScratchRoll.deleteMany({ where: { userId } });
            await tx.redeemScratchPass.deleteMany({ where: { userId } });
            await tx.scratchArchiveEntry.deleteMany({ where: { userId } });
            await tx.sensitivityCompare.deleteMany({ where: { userId } });
            await tx.walletLedger.deleteMany({ where: { userId } });
            await tx.userBoostCharge.deleteMany({ where: { userId } });
            await tx.scratchRoll.deleteMany({ where: { userId } });
            await tx.supportThread.deleteMany({ where: { userId } });
            await tx.devicePushToken.deleteMany({ where: { userId } });
            await tx.appAnalyticsEvent.deleteMany({ where: { userId } });
            await tx.deviceInstall.updateMany({
                where: { userId },
                data: { userId: null },
            });
            await tx.redeemCodeSecret.updateMany({
                where: { assignedUserId: userId },
                data: { assignedUserId: null, assignedAt: null },
            });
            const wiped = await tx.user.updateMany({
                where: { id: userId, isActive: false, dataDeletedAt: null },
                data: {
                    displayName: 'Deleted user',
                    googleName: '',
                    photoUrl: null,
                    ffUid: '',
                    playRole: '',
                    region: '',
                    notifyPush: false,
                    coins: 0,
                    streakDays: 0,
                    lastCheckinDay: null,
                    walletFrozen: false,
                    walletNote: '',
                    isActive: false,
                    isRestricted: false,
                    googleBanned: true,
                    tokenVersion: { increment: 1 },
                    dataDeletedAt: new Date(),
                    lastLoginAt: null,
                },
            });
            if (wiped.count !== 1) {
                throw new app_error_1.AppError('USER_STATUS_CONFLICT', 'Suspend the account before deleting data.', 409);
            }
            await tx.auditLog.create({
                data: {
                    actorAdminId: admin.id,
                    action: 'user:delete-data',
                    entity: `user:${userId}`,
                    beforeJson: {
                        isActive: before.isActive,
                        coins: before.coins,
                        email: before.email,
                    },
                    afterJson: {
                        dataDeleted: true,
                        googleBanned: true,
                    },
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