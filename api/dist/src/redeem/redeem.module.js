"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedeemModule = void 0;
const common_1 = require("@nestjs/common");
const auth_module_1 = require("../auth/auth.module");
const analytics_module_1 = require("../analytics/analytics.module");
const settings_module_1 = require("../settings/settings.module");
const claims_admin_controller_1 = require("./claims-admin.controller");
const claims_module_guard_1 = require("./claims-module.guard");
const redeem_admin_controller_1 = require("./redeem-admin.controller");
const redeem_admin_service_1 = require("./redeem-admin.service");
const redeem_controller_1 = require("./redeem.controller");
const redeem_module_guard_1 = require("./redeem-module.guard");
const redeem_service_1 = require("./redeem.service");
let RedeemModule = class RedeemModule {
};
exports.RedeemModule = RedeemModule;
exports.RedeemModule = RedeemModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule, settings_module_1.SettingsAdminModule, analytics_module_1.AnalyticsModule],
        controllers: [redeem_controller_1.RedeemController, claims_admin_controller_1.ClaimsAdminController, redeem_admin_controller_1.RedeemAdminController],
        providers: [
            redeem_service_1.RedeemService,
            claims_module_guard_1.ClaimsModuleGuard,
            redeem_admin_service_1.RedeemAdminService,
            redeem_module_guard_1.RedeemModuleGuard,
        ],
        exports: [redeem_service_1.RedeemService],
    })
], RedeemModule);
//# sourceMappingURL=redeem.module.js.map