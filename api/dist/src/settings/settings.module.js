"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsAdminModule = void 0;
const common_1 = require("@nestjs/common");
const settings_admin_controller_1 = require("./settings-admin.controller");
const settings_module_guard_1 = require("./settings-module.guard");
const settings_service_1 = require("./settings.service");
let SettingsAdminModule = class SettingsAdminModule {
};
exports.SettingsAdminModule = SettingsAdminModule;
exports.SettingsAdminModule = SettingsAdminModule = __decorate([
    (0, common_1.Module)({
        controllers: [settings_admin_controller_1.SettingsAdminController],
        providers: [settings_service_1.SettingsService, settings_module_guard_1.SettingsModuleGuard],
        exports: [settings_service_1.SettingsService],
    })
], SettingsAdminModule);
//# sourceMappingURL=settings.module.js.map