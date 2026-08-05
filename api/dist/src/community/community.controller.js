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
exports.CommunityController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const user_jwt_auth_guard_1 = require("../user-auth/user-jwt-auth.guard");
const current_user_decorator_1 = require("../user-auth/current-user.decorator");
const app_error_1 = require("../common/errors/app-error");
const community_service_1 = require("./community.service");
const community_dto_1 = require("./dto/community.dto");
let CommunityController = class CommunityController {
    community;
    constructor(community) {
        this.community = community;
    }
    feed() {
        return this.community.feed();
    }
    submit(user, dto) {
        return this.community.submit(user.id, dto);
    }
    report(user, id) {
        if (!id?.trim() || id.includes('/') || id.length > 64) {
            throw new app_error_1.AppError('COMMUNITY_BAD_ID', 'Invalid post id.', 400);
        }
        return this.community.report(user.id, id.trim());
    }
};
exports.CommunityController = CommunityController;
__decorate([
    (0, common_1.Get)('feed'),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CommunityController.prototype, "feed", null);
__decorate([
    (0, common_1.Post)('posts'),
    (0, throttler_1.Throttle)({ default: { limit: 8, ttl: 60_000 } }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, community_dto_1.SubmitCommunityPostDto]),
    __metadata("design:returntype", void 0)
], CommunityController.prototype, "submit", null);
__decorate([
    (0, common_1.Post)('posts/:id/report'),
    (0, throttler_1.Throttle)({ default: { limit: 15, ttl: 60_000 } }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CommunityController.prototype, "report", null);
exports.CommunityController = CommunityController = __decorate([
    (0, common_1.Controller)('api/v1/community'),
    (0, common_1.UseGuards)(user_jwt_auth_guard_1.UserJwtAuthGuard),
    __metadata("design:paramtypes", [community_service_1.CommunityService])
], CommunityController);
//# sourceMappingURL=community.controller.js.map