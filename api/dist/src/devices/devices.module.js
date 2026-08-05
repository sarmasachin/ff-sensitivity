"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevicesModule = void 0;
const common_1 = require("@nestjs/common");
const analytics_module_1 = require("../analytics/analytics.module");
const devices_admin_controller_1 = require("./devices-admin.controller");
const devices_controller_1 = require("./devices.controller");
const devices_module_guard_1 = require("./devices-module.guard");
const devices_service_1 = require("./devices.service");
let DevicesModule = class DevicesModule {
};
exports.DevicesModule = DevicesModule;
exports.DevicesModule = DevicesModule = __decorate([
    (0, common_1.Module)({
        imports: [analytics_module_1.AnalyticsModule],
        controllers: [devices_controller_1.DevicesController, devices_admin_controller_1.DevicesAdminController],
        providers: [devices_service_1.DevicesService, devices_module_guard_1.DevicesModuleGuard],
        exports: [devices_service_1.DevicesService],
    })
], DevicesModule);
//# sourceMappingURL=devices.module.js.map