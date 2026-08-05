"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromosModule = void 0;
const common_1 = require("@nestjs/common");
const auth_module_1 = require("../auth/auth.module");
const promos_admin_controller_1 = require("./promos-admin.controller");
const promos_controller_1 = require("./promos.controller");
const promos_module_guard_1 = require("./promos-module.guard");
const promos_service_1 = require("./promos.service");
let PromosModule = class PromosModule {
};
exports.PromosModule = PromosModule;
exports.PromosModule = PromosModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule],
        controllers: [promos_controller_1.PromosController, promos_admin_controller_1.PromosAdminController],
        providers: [promos_service_1.PromosService, promos_module_guard_1.PromosModuleGuard],
    })
], PromosModule);
//# sourceMappingURL=promos.module.js.map