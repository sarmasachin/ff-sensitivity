"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersAdminModule = void 0;
const common_1 = require("@nestjs/common");
const users_admin_controller_1 = require("./users-admin.controller");
const users_module_guard_1 = require("./users-module.guard");
const users_service_1 = require("./users.service");
let UsersAdminModule = class UsersAdminModule {
};
exports.UsersAdminModule = UsersAdminModule;
exports.UsersAdminModule = UsersAdminModule = __decorate([
    (0, common_1.Module)({
        controllers: [users_admin_controller_1.UsersAdminController],
        providers: [users_service_1.UsersService, users_module_guard_1.UsersModuleGuard],
    })
], UsersAdminModule);
//# sourceMappingURL=users.module.js.map