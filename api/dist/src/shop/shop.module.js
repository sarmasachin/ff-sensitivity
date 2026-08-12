"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopModule = void 0;
const common_1 = require("@nestjs/common");
const auth_module_1 = require("../auth/auth.module");
const shop_admin_controller_1 = require("./shop-admin.controller");
const shop_admin_service_1 = require("./shop-admin.service");
const shop_module_guard_1 = require("./shop-module.guard");
let ShopModule = class ShopModule {
};
exports.ShopModule = ShopModule;
exports.ShopModule = ShopModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule],
        controllers: [shop_admin_controller_1.ShopAdminController],
        providers: [shop_admin_service_1.ShopAdminService, shop_module_guard_1.ShopModuleGuard],
        exports: [shop_admin_service_1.ShopAdminService],
    })
], ShopModule);
//# sourceMappingURL=shop.module.js.map