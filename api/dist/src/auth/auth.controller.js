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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const auth_service_1 = require("./auth.service");
const auth_cookies_1 = require("./auth-cookies");
const login_dto_1 = require("./dto/login.dto");
const update_profile_dto_1 = require("./dto/update-profile.dto");
const change_password_dto_1 = require("./dto/change-password.dto");
const resend_login_otp_dto_1 = require("./dto/resend-login-otp.dto");
const verify_login_otp_dto_1 = require("./dto/verify-login-otp.dto");
const jwt_auth_guard_1 = require("./jwt-auth.guard");
let AuthController = class AuthController {
    auth;
    config;
    constructor(auth, config) {
        this.auth = auth;
        this.config = config;
    }
    async login(dto, req, res) {
        const ip = req.ip ?? req.headers['x-forwarded-for'];
        const result = await this.auth.login(dto, typeof ip === 'string' ? ip : undefined);
        if ('requiresOtp' in result)
            return result;
        this.applySessionCookies(res, result);
        return { admin: result.admin };
    }
    async verifyLoginOtp(dto, req, res) {
        const ip = req.ip ?? req.headers['x-forwarded-for'];
        const result = await this.auth.verifyLoginOtp(dto, typeof ip === 'string' ? ip : undefined);
        this.applySessionCookies(res, result);
        return { admin: result.admin };
    }
    resendLoginOtp(dto) {
        return this.auth.resendLoginOtp(dto);
    }
    async refresh(req, res) {
        const result = await this.auth.refresh(req.cookies?.refresh_token);
        this.applySessionCookies(res, result);
        return { admin: result.admin };
    }
    async logout(req, res) {
        await this.auth.logout(req.cookies?.refresh_token);
        (0, auth_cookies_1.clearAuthCookies)(res, this.config);
        return { ok: true };
    }
    me(req) {
        return this.auth.me(req.user.id);
    }
    updateMe(req, dto) {
        return this.auth.updateProfile(req.user.id, dto);
    }
    changePassword(req, dto) {
        return this.auth.changePassword(req.user.id, dto);
    }
    applySessionCookies(res, result) {
        (0, auth_cookies_1.setAuthCookies)(res, this.config, {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
        }, result.refreshDays);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('login'),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60_000 } }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('login/verify-otp'),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60_000 } }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_login_otp_dto_1.VerifyLoginOtpDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyLoginOtp", null);
__decorate([
    (0, common_1.Post)('login/resend-otp'),
    (0, throttler_1.Throttle)({ default: { limit: 4, ttl: 10 * 60_000 } }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [resend_login_otp_dto_1.ResendLoginOtpDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "resendLoginOtp", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60_000 } }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('logout'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "me", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Patch)('me'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_profile_dto_1.UpdateProfileDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "updateMe", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('password'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, change_password_dto_1.ChangePasswordDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "changePassword", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('api/v1/auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        config_1.ConfigService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map