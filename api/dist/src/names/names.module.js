"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NamesModule = void 0;
const common_1 = require("@nestjs/common");
const auth_module_1 = require("../auth/auth.module");
const names_admin_controller_1 = require("./names-admin.controller");
const names_controller_1 = require("./names.controller");
const names_module_guard_1 = require("./names-module.guard");
const names_service_1 = require("./names.service");
let NamesModule = class NamesModule {
};
exports.NamesModule = NamesModule;
exports.NamesModule = NamesModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule],
        controllers: [names_controller_1.NamesController, names_admin_controller_1.NamesAdminController],
        providers: [names_service_1.NamesService, names_module_guard_1.NamesModuleGuard],
    })
], NamesModule);
//# sourceMappingURL=names.module.js.map