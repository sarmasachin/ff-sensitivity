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
exports.StaffAdminController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_admin_decorator_1 = require("../auth/current-admin.decorator");
const staff_module_guard_1 = require("./staff-module.guard");
const staff_service_1 = require("./staff.service");
const staff_dto_1 = require("./dto/staff.dto");
let StaffAdminController = class StaffAdminController {
    staff;
    constructor(staff) {
        this.staff = staff;
    }
    list() {
        return this.staff.adminList();
    }
    invite(admin, dto) {
        return this.staff.invite(admin, dto);
    }
    setModules(admin, id, dto) {
        return this.staff.setModules(admin, id, dto);
    }
    disable(admin, id) {
        return this.staff.disable(admin, id);
    }
    enable(admin, id) {
        return this.staff.enable(admin, id);
    }
    resend(admin, id) {
        return this.staff.resendInvite(admin, id);
    }
};
exports.StaffAdminController = StaffAdminController;
__decorate([
    (0, common_1.Get)(),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], StaffAdminController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('invite'),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, staff_dto_1.StaffInviteDto]),
    __metadata("design:returntype", void 0)
], StaffAdminController.prototype, "invite", null);
__decorate([
    (0, common_1.Patch)(':id/modules'),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, staff_dto_1.StaffModulesDto]),
    __metadata("design:returntype", void 0)
], StaffAdminController.prototype, "setModules", null);
__decorate([
    (0, common_1.Post)(':id/disable'),
    (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], StaffAdminController.prototype, "disable", null);
__decorate([
    (0, common_1.Post)(':id/enable'),
    (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], StaffAdminController.prototype, "enable", null);
__decorate([
    (0, common_1.Post)(':id/resend-invite'),
    (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], StaffAdminController.prototype, "resend", null);
exports.StaffAdminController = StaffAdminController = __decorate([
    (0, common_1.Controller)('api/v1/admin/staff'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, staff_module_guard_1.StaffModuleGuard),
    __metadata("design:paramtypes", [staff_service_1.StaffService])
], StaffAdminController);
//# sourceMappingURL=staff-admin.controller.js.map