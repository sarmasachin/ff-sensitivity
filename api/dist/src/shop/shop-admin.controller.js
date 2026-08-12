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
exports.ShopAdminController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const client_1 = require("@prisma/client");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_admin_decorator_1 = require("../auth/current-admin.decorator");
const app_error_1 = require("../common/errors/app-error");
const shop_module_guard_1 = require("./shop-module.guard");
const shop_admin_service_1 = require("./shop-admin.service");
const shop_admin_dto_1 = require("./dto/shop-admin.dto");
let ShopAdminController = class ShopAdminController {
    shop;
    constructor(shop) {
        this.shop = shop;
    }
    listCategories() {
        return this.shop.listCategories();
    }
    createCategory(admin, dto) {
        this.assertCanMutate(admin);
        return this.shop.createCategory(admin.id, dto);
    }
    updateCategory(admin, id, dto) {
        this.assertCanMutate(admin);
        return this.shop.updateCategory(admin.id, id, dto);
    }
    removeCategory(admin, id) {
        this.assertCanMutate(admin);
        return this.shop.removeCategory(admin.id, id);
    }
    list() {
        return this.shop.list();
    }
    create(admin, dto) {
        this.assertCanMutate(admin);
        return this.shop.create(admin.id, dto);
    }
    update(admin, id, dto) {
        this.assertCanMutate(admin);
        return this.shop.update(admin.id, id, dto);
    }
    remove(admin, id) {
        this.assertCanMutate(admin);
        return this.shop.remove(admin.id, id);
    }
    assertCanMutate(admin) {
        if (admin.role === client_1.AdminRole.VIEWER) {
            throw new app_error_1.AppError('FORBIDDEN_ROLE', 'Viewers cannot change the shop catalog.', 403);
        }
    }
};
exports.ShopAdminController = ShopAdminController;
__decorate([
    (0, common_1.Get)('categories'),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ShopAdminController.prototype, "listCategories", null);
__decorate([
    (0, common_1.Post)('categories'),
    (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, shop_admin_dto_1.CreateShopCategoryDto]),
    __metadata("design:returntype", void 0)
], ShopAdminController.prototype, "createCategory", null);
__decorate([
    (0, common_1.Patch)('categories/:id'),
    (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, shop_admin_dto_1.UpdateShopCategoryDto]),
    __metadata("design:returntype", void 0)
], ShopAdminController.prototype, "updateCategory", null);
__decorate([
    (0, common_1.Delete)('categories/:id'),
    (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ShopAdminController.prototype, "removeCategory", null);
__decorate([
    (0, common_1.Get)(),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ShopAdminController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, shop_admin_dto_1.CreateShopItemDto]),
    __metadata("design:returntype", void 0)
], ShopAdminController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, shop_admin_dto_1.UpdateShopItemDto]),
    __metadata("design:returntype", void 0)
], ShopAdminController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ShopAdminController.prototype, "remove", null);
exports.ShopAdminController = ShopAdminController = __decorate([
    (0, common_1.Controller)('api/v1/admin/shop'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, shop_module_guard_1.ShopModuleGuard),
    __metadata("design:paramtypes", [shop_admin_service_1.ShopAdminService])
], ShopAdminController);
//# sourceMappingURL=shop-admin.controller.js.map