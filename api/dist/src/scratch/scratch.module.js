"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScratchModule = void 0;
const common_1 = require("@nestjs/common");
const auth_module_1 = require("../auth/auth.module");
const analytics_module_1 = require("../analytics/analytics.module");
const economy_module_1 = require("../economy/economy.module");
const redeem_module_1 = require("../redeem/redeem.module");
const scratch_admin_controller_1 = require("./scratch-admin.controller");
const scratch_controller_1 = require("./scratch.controller");
const scratch_module_guard_1 = require("./scratch-module.guard");
const scratch_service_1 = require("./scratch.service");
let ScratchModule = class ScratchModule {
};
exports.ScratchModule = ScratchModule;
exports.ScratchModule = ScratchModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule, economy_module_1.EconomyModule, redeem_module_1.RedeemModule, analytics_module_1.AnalyticsModule],
        controllers: [scratch_controller_1.ScratchController, scratch_admin_controller_1.ScratchAdminController],
        providers: [scratch_service_1.ScratchService, scratch_module_guard_1.ScratchModuleGuard],
    })
], ScratchModule);
//# sourceMappingURL=scratch.module.js.map