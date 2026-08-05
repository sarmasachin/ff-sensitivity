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
exports.JwtAccessStrategy = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const app_error_1 = require("../common/errors/app-error");
const auth_cookies_1 = require("./auth-cookies");
function accessTokenFromRequest(req) {
    const fromHeader = passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (fromHeader)
        return fromHeader;
    const cookie = req?.cookies?.[auth_cookies_1.ACCESS_COOKIE];
    return typeof cookie === 'string' && cookie.length > 0 ? cookie : null;
}
let JwtAccessStrategy = class JwtAccessStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy, 'jwt') {
    prisma;
    constructor(config, prisma) {
        super({
            jwtFromRequest: accessTokenFromRequest,
            ignoreExpiration: false,
            secretOrKey: config.getOrThrow('JWT_ACCESS_SECRET'),
        });
        this.prisma = prisma;
    }
    async validate(payload) {
        const admin = await this.prisma.admin.findUnique({
            where: { id: payload.sub },
        });
        if (!admin || !admin.isActive) {
            throw new app_error_1.AppError('AUTH_INVALID', 'Invalid or inactive account.', 401);
        }
        return {
            id: admin.id,
            email: admin.email,
            role: admin.role,
            allowedModules: admin.allowedModules,
            mustChangePassword: admin.mustChangePassword,
        };
    }
};
exports.JwtAccessStrategy = JwtAccessStrategy;
exports.JwtAccessStrategy = JwtAccessStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], JwtAccessStrategy);
//# sourceMappingURL=jwt-access.strategy.js.map