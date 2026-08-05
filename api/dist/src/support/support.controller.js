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
exports.SupportController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const user_jwt_auth_guard_1 = require("../user-auth/user-jwt-auth.guard");
const current_user_decorator_1 = require("../user-auth/current-user.decorator");
const app_error_1 = require("../common/errors/app-error");
const support_service_1 = require("./support.service");
const support_dto_1 = require("./dto/support.dto");
let SupportController = class SupportController {
    support;
    constructor(support) {
        this.support = support;
    }
    mine(user) {
        return this.support.userGetMine(user.id);
    }
    start(user, dto) {
        return this.support.userStart(user.id, dto);
    }
    reply(user, id, dto) {
        if (!id?.trim() || id.includes('/') || id.length > 64) {
            throw new app_error_1.AppError('SUPPORT_BAD_ID', 'Invalid thread id.', 400);
        }
        return this.support.userReply(user.id, id.trim(), dto);
    }
};
exports.SupportController = SupportController;
__decorate([
    (0, common_1.Get)('thread'),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SupportController.prototype, "mine", null);
__decorate([
    (0, common_1.Post)('thread'),
    (0, throttler_1.Throttle)({ default: { limit: 15, ttl: 60_000 } }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, support_dto_1.StartSupportThreadDto]),
    __metadata("design:returntype", void 0)
], SupportController.prototype, "start", null);
__decorate([
    (0, common_1.Post)('thread/:id/messages'),
    (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60_000 } }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, support_dto_1.SupportMessageDto]),
    __metadata("design:returntype", void 0)
], SupportController.prototype, "reply", null);
exports.SupportController = SupportController = __decorate([
    (0, common_1.Controller)('api/v1/support'),
    (0, common_1.UseGuards)(user_jwt_auth_guard_1.UserJwtAuthGuard),
    __metadata("design:paramtypes", [support_service_1.SupportService])
], SupportController);
//# sourceMappingURL=support.controller.js.map