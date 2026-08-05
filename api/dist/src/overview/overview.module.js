"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverviewAdminModule = void 0;
const common_1 = require("@nestjs/common");
const analytics_module_1 = require("../analytics/analytics.module");
const overview_admin_controller_1 = require("./overview-admin.controller");
const overview_module_guard_1 = require("./overview-module.guard");
const overview_service_1 = require("./overview.service");
let OverviewAdminModule = class OverviewAdminModule {
};
exports.OverviewAdminModule = OverviewAdminModule;
exports.OverviewAdminModule = OverviewAdminModule = __decorate([
    (0, common_1.Module)({
        imports: [analytics_module_1.AnalyticsModule],
        controllers: [overview_admin_controller_1.OverviewAdminController],
        providers: [overview_service_1.OverviewService, overview_module_guard_1.OverviewModuleGuard],
    })
], OverviewAdminModule);
//# sourceMappingURL=overview.module.js.map