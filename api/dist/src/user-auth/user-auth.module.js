"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserAuthModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const analytics_module_1 = require("../analytics/analytics.module");
const user_auth_controller_1 = require("./user-auth.controller");
const user_auth_service_1 = require("./user-auth.service");
const user_jwt_strategy_1 = require("./user-jwt.strategy");
let UserAuthModule = class UserAuthModule {
};
exports.UserAuthModule = UserAuthModule;
exports.UserAuthModule = UserAuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            passport_1.PassportModule,
            analytics_module_1.AnalyticsModule,
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    secret: config.getOrThrow('JWT_USER_SECRET'),
                }),
            }),
        ],
        controllers: [user_auth_controller_1.UserAuthController],
        providers: [user_auth_service_1.UserAuthService, user_jwt_strategy_1.UserJwtStrategy],
        exports: [user_auth_service_1.UserAuthService],
    })
], UserAuthModule);
//# sourceMappingURL=user-auth.module.js.map