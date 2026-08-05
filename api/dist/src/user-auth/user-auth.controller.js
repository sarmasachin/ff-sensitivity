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
exports.UserAuthController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const user_auth_service_1 = require("./user-auth.service");
const google_auth_dto_1 = require("./dto/google-auth.dto");
const user_logout_dto_1 = require("./dto/user-logout.dto");
const user_jwt_auth_guard_1 = require("./user-jwt-auth.guard");
const current_user_decorator_1 = require("./current-user.decorator");
let UserAuthController = class UserAuthController {
    userAuth;
    constructor(userAuth) {
        this.userAuth = userAuth;
    }
    google(dto) {
        return this.userAuth.loginWithGoogle(dto);
    }
    logout(user, dto) {
        return this.userAuth.logout(user.id, dto.installId);
    }
};
exports.UserAuthController = UserAuthController;
__decorate([
    (0, common_1.Post)('google'),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60_000 } }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [google_auth_dto_1.GoogleAuthDto]),
    __metadata("design:returntype", void 0)
], UserAuthController.prototype, "google", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.UseGuards)(user_jwt_auth_guard_1.UserJwtAuthGuard),
    (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60_000 } }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, user_logout_dto_1.UserLogoutDto]),
    __metadata("design:returntype", void 0)
], UserAuthController.prototype, "logout", null);
exports.UserAuthController = UserAuthController = __decorate([
    (0, common_1.Controller)('api/v1/user/auth'),
    __metadata("design:paramtypes", [user_auth_service_1.UserAuthService])
], UserAuthController);
//# sourceMappingURL=user-auth.controller.js.map