"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffAdminModule = void 0;
const common_1 = require("@nestjs/common");
const settings_module_1 = require("../settings/settings.module");
const staff_admin_controller_1 = require("./staff-admin.controller");
const staff_module_guard_1 = require("./staff-module.guard");
const staff_service_1 = require("./staff.service");
let StaffAdminModule = class StaffAdminModule {
};
exports.StaffAdminModule = StaffAdminModule;
exports.StaffAdminModule = StaffAdminModule = __decorate([
    (0, common_1.Module)({
        imports: [settings_module_1.SettingsAdminModule],
        controllers: [staff_admin_controller_1.StaffAdminController],
        providers: [staff_service_1.StaffService, staff_module_guard_1.StaffModuleGuard],
    })
], StaffAdminModule);
//# sourceMappingURL=staff.module.js.map