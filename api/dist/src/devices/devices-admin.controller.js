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
exports.DevicesAdminController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_admin_decorator_1 = require("../auth/current-admin.decorator");
const devices_module_guard_1 = require("./devices-module.guard");
const devices_service_1 = require("./devices.service");
const devices_dto_1 = require("./dto/devices.dto");
let DevicesAdminController = class DevicesAdminController {
    devices;
    constructor(devices) {
        this.devices = devices;
    }
    list() {
        return this.devices.adminList();
    }
    block(admin, id) {
        return this.devices.adminBlock(admin, id);
    }
    unblock(admin, id) {
        return this.devices.adminUnblock(admin, id);
    }
    invalidate(admin, id) {
        return this.devices.adminInvalidateToken(admin, id);
    }
    note(admin, id, dto) {
        return this.devices.adminPatchNote(admin, id, dto);
    }
};
exports.DevicesAdminController = DevicesAdminController;
__decorate([
    (0, common_1.Get)(),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DevicesAdminController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(':id/block'),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DevicesAdminController.prototype, "block", null);
__decorate([
    (0, common_1.Post)(':id/unblock'),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DevicesAdminController.prototype, "unblock", null);
__decorate([
    (0, common_1.Post)(':id/invalidate-token'),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DevicesAdminController.prototype, "invalidate", null);
__decorate([
    (0, common_1.Patch)(':id/note'),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, devices_dto_1.PatchDeviceNoteDto]),
    __metadata("design:returntype", void 0)
], DevicesAdminController.prototype, "note", null);
exports.DevicesAdminController = DevicesAdminController = __decorate([
    (0, common_1.Controller)('api/v1/admin/devices'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, devices_module_guard_1.DevicesModuleGuard),
    __metadata("design:paramtypes", [devices_service_1.DevicesService])
], DevicesAdminController);
//# sourceMappingURL=devices-admin.controller.js.map