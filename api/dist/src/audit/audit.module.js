"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditAdminModule = void 0;
const common_1 = require("@nestjs/common");
const audit_admin_controller_1 = require("./audit-admin.controller");
const audit_module_guard_1 = require("./audit-module.guard");
const audit_service_1 = require("./audit.service");
let AuditAdminModule = class AuditAdminModule {
};
exports.AuditAdminModule = AuditAdminModule;
exports.AuditAdminModule = AuditAdminModule = __decorate([
    (0, common_1.Module)({
        controllers: [audit_admin_controller_1.AuditAdminController],
        providers: [audit_service_1.AuditService, audit_module_guard_1.AuditModuleGuard],
    })
], AuditAdminModule);
//# sourceMappingURL=audit.module.js.map