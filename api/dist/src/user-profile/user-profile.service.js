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
exports.UserProfileService = void 0;
const common_1 = require("@nestjs/common");
const app_error_1 = require("../common/errors/app-error");
const prisma_service_1 = require("../prisma/prisma.service");
const user_profile_options_1 = require("./user-profile.options");
let UserProfileService = class UserProfileService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async get(userId) {
        const user = await this.load(userId);
        return { profile: this.toView(user) };
    }
    async update(userId, dto) {
        const displayName = (0, user_profile_options_1.cleanDisplayName)(dto.displayName);
        const ffUid = (0, user_profile_options_1.cleanFfUid)(dto.ffUid);
        const playRole = (0, user_profile_options_1.cleanChoice)(dto.playRole, user_profile_options_1.PROFILE_ROLES);
        const region = (0, user_profile_options_1.cleanRegion)(dto.region);
        if (!displayName || ffUid == null || playRole == null || region == null) {
            throw new app_error_1.AppError('PROFILE_INVALID', 'Check the profile fields and try again.', 400);
        }
        const prior = await this.load(userId);
        const googleName = prior.googleName.trim() || prior.displayName;
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: {
                displayName,
                googleName,
                ffUid,
                playRole,
                region,
                notifyPush: dto.notifyPush,
            },
        });
        await this.syncPush(userId, dto.notifyPush);
        return { profile: this.toView(user) };
    }
    async deleteAccount(userId) {
        const before = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!before) {
            throw new app_error_1.AppError('USER_NOT_FOUND', 'User not found.', 404);
        }
        if (before.dataDeletedAt) {
            return { ok: true };
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
                data: { userId: null, pushEnabled: false },
            });
            await tx.redeemCodeSecret.updateMany({
                where: { assignedUserId: userId },
                data: { assignedUserId: null, assignedAt: null },
            });
            await tx.user.update({
                where: { id: userId },
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
                    googleBanned: false,
                    tokenVersion: { increment: 1 },
                    dataDeletedAt: new Date(),
                    lastLoginAt: null,
                },
            });
        });
        return { ok: true };
    }
    async syncPush(userId, notifyPush) {
        if (!notifyPush) {
            await this.prisma.devicePushToken.updateMany({
                where: { userId },
                data: { pushEnabled: false },
            });
            await this.prisma.deviceInstall.updateMany({
                where: { userId },
                data: { pushEnabled: false },
            });
            return;
        }
        const latest = await this.prisma.devicePushToken.findFirst({
            where: { userId },
            orderBy: { lastSeenAt: 'desc' },
            select: { id: true },
        });
        if (latest) {
            await this.prisma.devicePushToken.update({
                where: { id: latest.id },
                data: { pushEnabled: true },
            });
        }
        await this.prisma.deviceInstall.updateMany({
            where: { userId },
            data: { pushEnabled: true },
        });
    }
    async load(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.isActive || user.dataDeletedAt) {
            throw new app_error_1.AppError('AUTH_REQUIRED', 'Please sign in again.', 401);
        }
        return user;
    }
    toView(user) {
        return {
            googleName: user.googleName.trim() || user.displayName,
            email: user.email,
            photoUrl: user.photoUrl,
            displayName: user.displayName,
            ffUid: user.ffUid,
            playRole: user.playRole,
            region: user.region,
            notifyPush: user.notifyPush,
            coins: user.coins,
            streakDays: user.streakDays,
        };
    }
};
exports.UserProfileService = UserProfileService;
exports.UserProfileService = UserProfileService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UserProfileService);
//# sourceMappingURL=user-profile.service.js.map