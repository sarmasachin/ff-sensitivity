"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CopyModule = void 0;
const common_1 = require("@nestjs/common");
const copy_admin_controller_1 = require("./copy-admin.controller");
const copy_module_guard_1 = require("./copy-module.guard");
const copy_public_controller_1 = require("./copy-public.controller");
const copy_service_1 = require("./copy.service");
let CopyModule = class CopyModule {
};
exports.CopyModule = CopyModule;
exports.CopyModule = CopyModule = __decorate([
    (0, common_1.Module)({
        controllers: [copy_admin_controller_1.CopyAdminController, copy_public_controller_1.CopyPublicController],
        providers: [copy_service_1.CopyService, copy_module_guard_1.CopyModuleGuard],
    })
], CopyModule);
//# sourceMappingURL=copy.module.js.map