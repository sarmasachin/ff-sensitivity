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
exports.UserProfileController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const current_user_decorator_1 = require("../user-auth/current-user.decorator");
const user_jwt_auth_guard_1 = require("../user-auth/user-jwt-auth.guard");
const update_profile_dto_1 = require("./dto/update-profile.dto");
const user_profile_service_1 = require("./user-profile.service");
let UserProfileController = class UserProfileController {
    profile;
    constructor(profile) {
        this.profile = profile;
    }
    get(user) {
        return this.profile.get(user.id);
    }
    update(user, dto) {
        return this.profile.update(user.id, dto);
    }
    deleteAccount(user) {
        return this.profile.deleteAccount(user.id);
    }
};
exports.UserProfileController = UserProfileController;
__decorate([
    (0, common_1.Get)(),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UserProfileController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)(),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60_000 } }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_profile_dto_1.UpdateProfileDto]),
    __metadata("design:returntype", void 0)
], UserProfileController.prototype, "update", null);
__decorate([
    (0, common_1.Post)('delete'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60_000 } }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UserProfileController.prototype, "deleteAccount", null);
exports.UserProfileController = UserProfileController = __decorate([
    (0, common_1.Controller)('api/v1/user/profile'),
    (0, common_1.UseGuards)(user_jwt_auth_guard_1.UserJwtAuthGuard),
    __metadata("design:paramtypes", [user_profile_service_1.UserProfileService])
], UserProfileController);
//# sourceMappingURL=user-profile.controller.js.map