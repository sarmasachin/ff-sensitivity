"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditAdminController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const audit_module_guard_1 = require("./audit-module.guard");
const audit_service_1 = require("./audit.service");
const audit_security_1 = require("./audit-security");
let AuditAdminController = class AuditAdminController {
    audit;
    constructor(audit) {
        this.audit = audit;
    }
    list(limitRaw) {
        const limit = limitRaw ? (0, audit_security_1.assertAuditLimit)(Number(limitRaw)) : 200;
        return this.audit.adminList(limit);
    }
};
exports.AuditAdminController = AuditAdminController;
__decorate([
    (0, common_1.Get)(),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AuditAdminController.prototype, "list", null);
exports.AuditAdminController = AuditAdminController = __decorate([
    (0, common_1.Controller)('api/v1/admin/audit'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, audit_module_guard_1.AuditModuleGuard),
    __metadata("design:paramtypes", [audit_service_1.AuditService])
], AuditAdminController);
//# sourceMappingURL=audit-admin.controller.js.map