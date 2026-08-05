"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushModule = void 0;
const common_1 = require("@nestjs/common");
const auth_module_1 = require("../auth/auth.module");
const devices_module_1 = require("../devices/devices.module");
const push_admin_controller_1 = require("./push-admin.controller");
const push_controller_1 = require("./push.controller");
const push_module_guard_1 = require("./push-module.guard");
const push_service_1 = require("./push.service");
let PushModule = class PushModule {
};
exports.PushModule = PushModule;
exports.PushModule = PushModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule, devices_module_1.DevicesModule],
        controllers: [push_controller_1.PushController, push_admin_controller_1.PushAdminController],
        providers: [push_service_1.PushService, push_module_guard_1.PushModuleGuard],
    })
], PushModule);
//# sourceMappingURL=push.module.js.map