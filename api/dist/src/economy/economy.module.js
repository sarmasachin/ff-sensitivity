"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EconomyModule = void 0;
const common_1 = require("@nestjs/common");
const auth_module_1 = require("../auth/auth.module");
const economy_controller_1 = require("./economy.controller");
const economy_admin_controller_1 = require("./economy-admin.controller");
const economy_admin_service_1 = require("./economy-admin.service");
const economy_earn_service_1 = require("./economy-earn.service");
const economy_service_1 = require("./economy.service");
const shop_module_1 = require("../shop/shop.module");
let EconomyModule = class EconomyModule {
};
exports.EconomyModule = EconomyModule;
exports.EconomyModule = EconomyModule = __decorate([
    (0, common_1.Module)({
        imports: [shop_module_1.ShopModule, auth_module_1.AuthModule],
        controllers: [economy_controller_1.EconomyController, economy_admin_controller_1.EconomyAdminController],
        providers: [economy_service_1.EconomyService, economy_earn_service_1.EconomyEarnService, economy_admin_service_1.EconomyAdminService],
        exports: [economy_service_1.EconomyService],
    })
], EconomyModule);
//# sourceMappingURL=economy.module.js.map