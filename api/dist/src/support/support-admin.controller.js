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
exports.SupportAdminController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_admin_decorator_1 = require("../auth/current-admin.decorator");
const app_error_1 = require("../common/errors/app-error");
const support_module_guard_1 = require("./support-module.guard");
const support_service_1 = require("./support.service");
const support_dto_1 = require("./dto/support.dto");
function assertSupportId(id, label = 'thread') {
    if (!id?.trim() || id.includes('/') || id.length > 64) {
        throw new app_error_1.AppError('SUPPORT_BAD_ID', `Invalid ${label} id.`, 400);
    }
    return id.trim();
}
let SupportAdminController = class SupportAdminController {
    support;
    constructor(support) {
        this.support = support;
    }
    list(q, status) {
        return this.support.adminList(q, status);
    }
    stats() {
        return this.support.adminStats();
    }
    reply(admin, id, dto) {
        return this.support.adminReply(admin.id, assertSupportId(id), dto);
    }
    close(admin, id) {
        return this.support.adminClose(admin.id, assertSupportId(id));
    }
    markRead(admin, id) {
        return this.support.adminMarkRead(admin.id, assertSupportId(id));
    }
    deleteMessage(admin, id, messageId) {
        return this.support.adminDeleteUserMessage(admin.id, assertSupportId(id), assertSupportId(messageId, 'message'));
    }
    deleteThread(admin, id) {
        return this.support.adminDeleteThread(admin.id, assertSupportId(id));
    }
};
exports.SupportAdminController = SupportAdminController;
__decorate([
    (0, common_1.Get)(),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SupportAdminController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SupportAdminController.prototype, "stats", null);
__decorate([
    (0, common_1.Post)(':id/reply'),
    (0, throttler_1.Throttle)({ default: { limit: 40, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, support_dto_1.AdminSupportReplyDto]),
    __metadata("design:returntype", void 0)
], SupportAdminController.prototype, "reply", null);
__decorate([
    (0, common_1.Patch)(':id/close'),
    (0, throttler_1.Throttle)({ default: { limit: 40, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SupportAdminController.prototype, "close", null);
__decorate([
    (0, common_1.Patch)(':id/read'),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SupportAdminController.prototype, "markRead", null);
__decorate([
    (0, common_1.Delete)(':id/messages/:messageId'),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('messageId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], SupportAdminController.prototype, "deleteMessage", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SupportAdminController.prototype, "deleteThread", null);
exports.SupportAdminController = SupportAdminController = __decorate([
    (0, common_1.Controller)('api/v1/admin/support'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, support_module_guard_1.SupportModuleGuard),
    __metadata("design:paramtypes", [support_service_1.SupportService])
], SupportAdminController);
//# sourceMappingURL=support-admin.controller.js.map