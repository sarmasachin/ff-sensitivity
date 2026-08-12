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
exports.RedeemAdminController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const client_1 = require("@prisma/client");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_admin_decorator_1 = require("../auth/current-admin.decorator");
const app_error_1 = require("../common/errors/app-error");
const redeem_module_guard_1 = require("./redeem-module.guard");
const redeem_admin_service_1 = require("./redeem-admin.service");
const redeem_admin_dto_1 = require("./dto/redeem-admin.dto");
let RedeemAdminController = class RedeemAdminController {
    redeem;
    constructor(redeem) {
        this.redeem = redeem;
    }
    list() {
        return this.redeem.list();
    }
    create(admin, dto) {
        this.assertCanMutate(admin);
        return this.redeem.create(admin.id, dto);
    }
    update(admin, id, dto) {
        this.assertCanMutate(admin);
        return this.redeem.update(admin.id, id, dto);
    }
    remove(admin, id) {
        this.assertCanMutate(admin);
        return this.redeem.remove(admin.id, id);
    }
    reveal(admin, id, dto) {
        this.assertCanMutate(admin);
        return this.redeem.reveal(admin.id, id, dto.currentPassword);
    }
    assertCanMutate(admin) {
        if (admin.role === client_1.AdminRole.VIEWER) {
            throw new app_error_1.AppError('FORBIDDEN_ROLE', 'Viewers cannot change redeem inventory.', 403);
        }
    }
};
exports.RedeemAdminController = RedeemAdminController;
__decorate([
    (0, common_1.Get)(),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RedeemAdminController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, redeem_admin_dto_1.CreateRedeemCodeDto]),
    __metadata("design:returntype", void 0)
], RedeemAdminController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, redeem_admin_dto_1.UpdateRedeemCodeDto]),
    __metadata("design:returntype", void 0)
], RedeemAdminController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RedeemAdminController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/reveal'),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, redeem_admin_dto_1.RevealRedeemCodeDto]),
    __metadata("design:returntype", void 0)
], RedeemAdminController.prototype, "reveal", null);
exports.RedeemAdminController = RedeemAdminController = __decorate([
    (0, common_1.Controller)('api/v1/admin/redeem'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, redeem_module_guard_1.RedeemModuleGuard),
    __metadata("design:paramtypes", [redeem_admin_service_1.RedeemAdminService])
], RedeemAdminController);
//# sourceMappingURL=redeem-admin.controller.js.map