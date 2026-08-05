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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcryptjs"));
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const app_error_1 = require("../common/errors/app-error");
const settings_service_1 = require("../settings/settings.service");
const login_otp_mail_service_1 = require("./login-otp-mail.service");
const auth_profile_1 = require("./auth-profile");
const LOCK_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;
const BCRYPT_ROUNDS = 12;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_RESENDS = 3;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
let AuthService = class AuthService {
    prisma;
    jwt;
    config;
    otpMail;
    settings;
    fails = new Map();
    constructor(prisma, jwt, config, otpMail, settings) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.config = config;
        this.otpMail = otpMail;
        this.settings = settings;
    }
    async login(dto, ip) {
        const email = dto.email.trim().toLowerCase();
        this.assertNotLocked(email);
        const admin = await this.prisma.admin.findUnique({ where: { email } });
        const ok = !!admin &&
            admin.isActive &&
            (await bcrypt.compare(dto.password, admin.passwordHash));
        if (!ok || !admin) {
            this.recordFail(email);
            throw new app_error_1.AppError('AUTH_INVALID', 'Invalid email or password.', 401);
        }
        this.fails.delete(email);
        if (this.otpEnabled()) {
            const challenge = await this.createOtpChallenge(admin, ip);
            return {
                requiresOtp: true,
                challengeId: challenge.id,
                expiresInSec: Math.floor(OTP_TTL_MS / 1000),
                resendAfterSec: Math.floor(OTP_RESEND_COOLDOWN_MS / 1000),
                maskedEmail: this.maskEmail(admin.email),
            };
        }
        return this.createSession(admin, ip);
    }
    async verifyLoginOtp(dto, ip) {
        const challenge = await this.prisma.adminLoginOtp.findUnique({
            where: { id: dto.challengeId },
            include: { admin: true },
        });
        if (!challenge ||
            challenge.consumedAt ||
            challenge.expiresAt.getTime() <= Date.now() ||
            !challenge.admin.isActive) {
            throw new app_error_1.AppError('AUTH_OTP_EXPIRED', 'This verification code has expired. Sign in again.', 401);
        }
        if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
            throw new app_error_1.AppError('AUTH_OTP_LOCKED', 'Too many incorrect attempts. Sign in again.', 429);
        }
        const expected = Buffer.from(challenge.codeHash, 'hex');
        const actual = Buffer.from(this.hashOtp(challenge.id, dto.code), 'hex');
        if (expected.length !== actual.length ||
            !(0, crypto_1.timingSafeEqual)(expected, actual)) {
            await this.prisma.adminLoginOtp.update({
                where: { id: challenge.id },
                data: { attempts: { increment: 1 } },
            });
            throw new app_error_1.AppError('AUTH_OTP_INVALID', 'The verification code is incorrect.', 401);
        }
        const consumed = await this.prisma.adminLoginOtp.updateMany({
            where: { id: challenge.id, consumedAt: null },
            data: { consumedAt: new Date() },
        });
        if (consumed.count !== 1) {
            throw new app_error_1.AppError('AUTH_OTP_USED', 'This verification code has already been used.', 401);
        }
        const session = await this.createSession(challenge.admin, ip ?? challenge.ip ?? undefined, 'auth.login_otp');
        return session;
    }
    async resendLoginOtp(dto) {
        const challenge = await this.prisma.adminLoginOtp.findUnique({
            where: { id: dto.challengeId },
            include: { admin: true },
        });
        if (!challenge ||
            challenge.consumedAt ||
            challenge.expiresAt.getTime() <= Date.now() ||
            !challenge.admin.isActive) {
            throw new app_error_1.AppError('AUTH_OTP_EXPIRED', 'This verification session has expired. Sign in again.', 401);
        }
        const waitMs = challenge.lastSentAt.getTime() +
            OTP_RESEND_COOLDOWN_MS -
            Date.now();
        if (waitMs > 0) {
            throw new app_error_1.AppError('AUTH_OTP_RESEND_WAIT', `Wait ${Math.ceil(waitMs / 1000)} seconds before requesting another code.`, 429);
        }
        if (challenge.resendCount >= OTP_MAX_RESENDS) {
            throw new app_error_1.AppError('AUTH_OTP_RESEND_LIMIT', 'Maximum resend attempts reached. Sign in again.', 429);
        }
        const code = this.generateOtp();
        const expiresAt = new Date(Date.now() + OTP_TTL_MS);
        await this.prisma.adminLoginOtp.update({
            where: { id: challenge.id },
            data: {
                codeHash: this.hashOtp(challenge.id, code),
                attempts: 0,
                resendCount: { increment: 1 },
                lastSentAt: new Date(),
                expiresAt,
            },
        });
        try {
            await this.otpMail.send({
                to: challenge.admin.email,
                code,
                displayName: challenge.admin.displayName,
                expiresMinutes: OTP_TTL_MS / 60_000,
            });
        }
        catch (error) {
            throw error;
        }
        return {
            ok: true,
            expiresInSec: Math.floor(OTP_TTL_MS / 1000),
            resendAfterSec: Math.floor(OTP_RESEND_COOLDOWN_MS / 1000),
            maskedEmail: this.maskEmail(challenge.admin.email),
        };
    }
    async createSession(admin, ip, auditAction = 'auth.login') {
        const ttl = this.config.get('JWT_ACCESS_TTL') ?? '15m';
        const accessToken = await this.jwt.signAsync({ sub: admin.id, email: admin.email, role: admin.role }, {
            secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
            expiresIn: ttl,
        });
        const refreshRaw = (0, crypto_1.randomBytes)(48).toString('hex');
        const refreshHash = this.hashToken(refreshRaw);
        let rememberDays = Number(this.config.get('JWT_REFRESH_TTL_DAYS') ?? 14);
        let singleSessionOnly = false;
        try {
            if (this.settings) {
                const policy = await this.settings.getBundle();
                rememberDays = policy.session.rememberDeviceDays;
                singleSessionOnly = policy.session.singleSessionOnly;
            }
        }
        catch {
        }
        if (singleSessionOnly) {
            await this.prisma.adminSession.deleteMany({
                where: { adminId: admin.id },
            });
        }
        const expiresAt = new Date(Date.now() + Math.max(0, rememberDays) * 24 * 60 * 60 * 1000);
        await this.prisma.adminSession.create({
            data: {
                adminId: admin.id,
                refreshTokenHash: refreshHash,
                ip: ip ?? null,
                expiresAt,
            },
        });
        await this.prisma.admin.update({
            where: { id: admin.id },
            data: { lastLoginAt: new Date() },
        });
        await this.prisma.auditLog.create({
            data: {
                actorAdminId: admin.id,
                action: auditAction,
                entity: 'admin',
                afterJson: { email: admin.email, ip: ip ?? null, singleSessionOnly },
            },
        });
        const profile = (0, auth_profile_1.toProfileView)(admin);
        return {
            accessToken,
            refreshToken: refreshRaw,
            admin: {
                id: profile.id,
                email: profile.email,
                role: profile.role,
                allowedModules: profile.allowedModules,
                mustChangePassword: profile.mustChangePassword,
                displayName: profile.displayName,
            },
        };
    }
    async me(adminId) {
        const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
        if (!admin || !admin.isActive) {
            throw new app_error_1.AppError('AUTH_INVALID', 'Invalid or inactive account.', 401);
        }
        return (0, auth_profile_1.toProfileView)(admin);
    }
    async updateProfile(adminId, dto) {
        const admin = await this.requireActiveAdmin(adminId);
        const displayName = (0, auth_profile_1.sanitizeProfileText)(dto.displayName, 64);
        const jobTitle = (0, auth_profile_1.sanitizeProfileText)(dto.jobTitle, 64);
        const deskLabel = (0, auth_profile_1.sanitizeProfileText)(dto.deskLabel, 64);
        const notifyEmail = (0, auth_profile_1.sanitizeProfileText)(dto.notifyEmail, 120).toLowerCase();
        const phone = (0, auth_profile_1.sanitizeProfileText)(dto.phone ?? '', 32);
        const timezoneLabel = (0, auth_profile_1.sanitizeProfileText)(dto.timezoneLabel, 64);
        if (displayName.length < 2) {
            throw new app_error_1.AppError('PROFILE_BAD_NAME', 'Display name is required.', 400);
        }
        if (jobTitle.length < 2) {
            throw new app_error_1.AppError('PROFILE_BAD_TITLE', 'Job title is required.', 400);
        }
        if (deskLabel.length < 2) {
            throw new app_error_1.AppError('PROFILE_BAD_DESK', 'Desk label is required.', 400);
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyEmail)) {
            throw new app_error_1.AppError('PROFILE_BAD_EMAIL', 'Notify email looks invalid.', 400);
        }
        if (timezoneLabel.length < 2) {
            throw new app_error_1.AppError('PROFILE_BAD_TZ', 'Timezone label is required.', 400);
        }
        (0, auth_profile_1.assertPhone)(phone);
        (0, auth_profile_1.assertSafeProfileText)(displayName, 'Display name');
        (0, auth_profile_1.assertSafeProfileText)(jobTitle, 'Job title');
        (0, auth_profile_1.assertSafeProfileText)(deskLabel, 'Desk label');
        (0, auth_profile_1.assertSafeProfileText)(timezoneLabel, 'Timezone');
        const updated = await this.prisma.admin.update({
            where: { id: admin.id },
            data: {
                displayName,
                jobTitle,
                deskLabel,
                notifyEmail,
                phone: phone || null,
                timezoneLabel,
                digestDaily: Boolean(dto.digestDaily),
                digestSecurity: Boolean(dto.digestSecurity),
            },
        });
        await this.prisma.auditLog.create({
            data: {
                actorAdminId: admin.id,
                action: 'auth.profile_update',
                entity: 'admin',
                beforeJson: {
                    displayName: admin.displayName,
                    jobTitle: admin.jobTitle,
                    deskLabel: admin.deskLabel,
                    notifyEmail: admin.notifyEmail,
                    phone: admin.phone,
                    timezoneLabel: admin.timezoneLabel,
                    digestDaily: admin.digestDaily,
                    digestSecurity: admin.digestSecurity,
                },
                afterJson: {
                    displayName,
                    jobTitle,
                    deskLabel,
                    notifyEmail,
                    phone: phone || null,
                    timezoneLabel,
                    digestDaily: Boolean(dto.digestDaily),
                    digestSecurity: Boolean(dto.digestSecurity),
                },
            },
        });
        return (0, auth_profile_1.toProfileView)(updated);
    }
    async changePassword(adminId, dto) {
        const lockKey = `pwd:${adminId}`;
        this.assertNotLocked(lockKey);
        const admin = await this.requireActiveAdmin(adminId);
        const currentOk = await bcrypt.compare(dto.currentPassword, admin.passwordHash);
        if (!currentOk) {
            this.recordFail(lockKey);
            throw new app_error_1.AppError('AUTH_BAD_PASSWORD', 'Current password is incorrect.', 400);
        }
        const next = dto.newPassword;
        if (next.length < 8 || next.length > 128) {
            throw new app_error_1.AppError('AUTH_WEAK_PASSWORD', 'New password must be 8–128 characters.', 400);
        }
        if (next === dto.currentPassword) {
            throw new app_error_1.AppError('AUTH_SAME_PASSWORD', 'New password must differ from the current one.', 400);
        }
        if (/\s/.test(next)) {
            throw new app_error_1.AppError('AUTH_WEAK_PASSWORD', 'Password must not contain spaces.', 400);
        }
        const passwordHash = await bcrypt.hash(next, BCRYPT_ROUNDS);
        const updated = await this.prisma.admin.update({
            where: { id: admin.id },
            data: {
                passwordHash,
                mustChangePassword: false,
            },
        });
        await this.prisma.adminSession.updateMany({
            where: { adminId: admin.id, revokedAt: null },
            data: { revokedAt: new Date() },
        });
        this.fails.delete(lockKey);
        await this.prisma.auditLog.create({
            data: {
                actorAdminId: admin.id,
                action: 'auth.password_change',
                entity: 'admin',
                afterJson: { mustChangePassword: false, sessionsRevoked: true },
            },
        });
        return (0, auth_profile_1.toProfileView)(updated);
    }
    async logout(refreshToken) {
        if (!refreshToken)
            return { ok: true };
        const hash = this.hashToken(refreshToken);
        await this.prisma.adminSession.updateMany({
            where: { refreshTokenHash: hash, revokedAt: null },
            data: { revokedAt: new Date() },
        });
        return { ok: true };
    }
    async createOtpChallenge(admin, ip) {
        const id = (0, crypto_1.randomBytes)(32).toString('hex');
        const code = this.generateOtp();
        const expiresAt = new Date(Date.now() + OTP_TTL_MS);
        await this.prisma.$transaction([
            this.prisma.adminLoginOtp.updateMany({
                where: { adminId: admin.id, consumedAt: null },
                data: { consumedAt: new Date() },
            }),
            this.prisma.adminLoginOtp.create({
                data: {
                    id,
                    adminId: admin.id,
                    codeHash: this.hashOtp(id, code),
                    expiresAt,
                    ip: ip ?? null,
                },
            }),
        ]);
        try {
            await this.otpMail.send({
                to: admin.email,
                code,
                displayName: admin.displayName,
                expiresMinutes: OTP_TTL_MS / 60_000,
            });
        }
        catch (error) {
            await this.prisma.adminLoginOtp.delete({ where: { id } }).catch(() => { });
            throw error;
        }
        return { id, expiresAt };
    }
    otpEnabled() {
        return ((this.config.get('ADMIN_OTP_ENABLED') ?? 'false').toLowerCase() ===
            'true');
    }
    generateOtp() {
        return (0, crypto_1.randomInt)(100_000, 1_000_000).toString();
    }
    hashOtp(challengeId, code) {
        const secret = this.config.getOrThrow('ADMIN_OTP_SECRET');
        return (0, crypto_1.createHmac)('sha256', secret)
            .update(`${challengeId}:${code}`)
            .digest('hex');
    }
    maskEmail(email) {
        const [local, domain] = email.split('@');
        const visible = local.slice(0, Math.min(2, local.length));
        return `${visible}${'*'.repeat(Math.max(3, local.length - visible.length))}@${domain}`;
    }
    async requireActiveAdmin(adminId) {
        const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
        if (!admin || !admin.isActive) {
            throw new app_error_1.AppError('AUTH_INVALID', 'Invalid or inactive account.', 401);
        }
        return admin;
    }
    hashToken(token) {
        return (0, crypto_1.createHash)('sha256').update(token).digest('hex');
    }
    assertNotLocked(email) {
        const row = this.fails.get(email);
        if (!row)
            return;
        if (Date.now() < row.until && row.count >= MAX_FAILS) {
            throw new app_error_1.AppError('AUTH_LOCKED', 'Too many failed attempts. Try again later.', 429);
        }
        if (Date.now() >= row.until)
            this.fails.delete(email);
    }
    recordFail(email) {
        const now = Date.now();
        const row = this.fails.get(email);
        if (!row || now >= row.until) {
            this.fails.set(email, { count: 1, until: now + LOCK_WINDOW_MS });
            return;
        }
        row.count += 1;
        if (row.count >= MAX_FAILS)
            row.until = now + LOCK_WINDOW_MS;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(4, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService,
        login_otp_mail_service_1.LoginOtpMailService,
        settings_service_1.SettingsService])
], AuthService);
//# sourceMappingURL=auth.service.js.map