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
exports.UserAuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const google_auth_library_1 = require("google-auth-library");
const prisma_service_1 = require("../prisma/prisma.service");
const app_error_1 = require("../common/errors/app-error");
const analytics_service_1 = require("../analytics/analytics.service");
const analytics_security_1 = require("../analytics/analytics-security");
let UserAuthService = class UserAuthService {
    prisma;
    jwt;
    config;
    analytics;
    googleClient;
    constructor(prisma, jwt, config, analytics) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.config = config;
        this.analytics = analytics;
        this.googleClient = new google_auth_library_1.OAuth2Client(this.config.getOrThrow('GOOGLE_WEB_CLIENT_ID'));
    }
    async loginWithGoogle(dto) {
        const audience = this.config.getOrThrow('GOOGLE_WEB_CLIENT_ID');
        let payload;
        try {
            const ticket = await this.googleClient.verifyIdToken({
                idToken: dto.idToken,
                audience,
            });
            payload = ticket.getPayload() ?? {};
        }
        catch {
            throw new app_error_1.AppError('AUTH_GOOGLE_INVALID', 'Google Sign-In failed.', 401);
        }
        const googleSub = payload.sub?.trim();
        const email = payload.email?.trim().toLowerCase();
        const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
        if (!googleSub || !email || !emailVerified) {
            throw new app_error_1.AppError('AUTH_GOOGLE_INVALID', 'Google account email is not available.', 401);
        }
        const displayName = payload.name?.trim() || email.split('@')[0] || 'Google Player';
        const photoUrl = payload.picture?.trim() || null;
        const bannedSeat = await this.prisma.bannedGoogleAccount.findFirst({
            where: { OR: [{ googleSub }, { email }] },
            select: { id: true },
        });
        if (bannedSeat) {
            throw new app_error_1.AppError('AUTH_SUSPENDED', 'This account is suspended.', 403);
        }
        const existing = await this.prisma.user.findUnique({
            where: { googleSub },
            select: { isActive: true, dataDeletedAt: true, googleBanned: true },
        });
        const rejoining = !!existing?.dataDeletedAt && !existing.googleBanned;
        if (existing &&
            (existing.googleBanned || (!existing.isActive && !rejoining))) {
            throw new app_error_1.AppError('AUTH_SUSPENDED', 'This account is suspended.', 403);
        }
        const user = await this.prisma.user.upsert({
            where: { googleSub },
            update: rejoining
                ? {
                    email,
                    displayName,
                    googleName: displayName,
                    photoUrl,
                    lastLoginAt: new Date(),
                    isActive: true,
                    isRestricted: false,
                    dataDeletedAt: null,
                    ffUid: '',
                    playRole: '',
                    region: '',
                    coins: 0,
                    streakDays: 0,
                    lastCheckinDay: null,
                    walletFrozen: false,
                    walletNote: '',
                    notifyPush: true,
                }
                : {
                    email,
                    googleName: displayName,
                    photoUrl,
                    lastLoginAt: new Date(),
                },
            create: {
                googleSub,
                email,
                displayName,
                googleName: displayName,
                photoUrl,
                lastLoginAt: new Date(),
            },
        });
        if (!user.isActive) {
            throw new app_error_1.AppError('AUTH_SUSPENDED', 'This account is suspended.', 403);
        }
        this.analytics.trackSafe({
            name: 'login',
            userId: user.id,
        });
        const accessToken = await this.jwt.signAsync({
            sub: user.id,
            email: user.email,
            aud: 'user',
            tv: user.tokenVersion,
        }, {
            secret: this.config.getOrThrow('JWT_USER_SECRET'),
            expiresIn: 60 * 60 * 24 * 90,
        });
        return {
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                displayName: user.displayName,
                coins: user.coins,
            },
        };
    }
    async logout(userId, installIdRaw) {
        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: { tokenVersion: { increment: 1 } },
            select: { id: true, tokenVersion: true },
        });
        let installId = null;
        try {
            installId = (0, analytics_security_1.optionalInstallId)(installIdRaw ?? null);
        }
        catch {
            installId = null;
        }
        this.analytics.trackSafe({
            name: 'logout',
            userId,
            installId,
        });
        return { ok: true, tokenVersion: updated.tokenVersion };
    }
};
exports.UserAuthService = UserAuthService;
exports.UserAuthService = UserAuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService,
        analytics_service_1.AnalyticsService])
], UserAuthService);
//# sourceMappingURL=user-auth.service.js.map