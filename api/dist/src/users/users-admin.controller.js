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
exports.UsersAdminController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_admin_decorator_1 = require("../auth/current-admin.decorator");
const users_module_guard_1 = require("./users-module.guard");
const users_service_1 = require("./users.service");
const users_dto_1 = require("./dto/users.dto");
let UsersAdminController = class UsersAdminController {
    users;
    constructor(users) {
        this.users = users;
    }
    list() {
        return this.users.adminListUsers();
    }
    setStatus(admin, userId, dto) {
        return this.users.adminSetStatus(admin, userId, dto);
    }
    setNote(admin, userId, dto) {
        return this.users.adminSetNote(admin, userId, dto);
    }
};
exports.UsersAdminController = UsersAdminController;
__decorate([
    (0, common_1.Get)(),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UsersAdminController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(':userId/status'),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, users_dto_1.UserStatusDto]),
    __metadata("design:returntype", void 0)
], UsersAdminController.prototype, "setStatus", null);
__decorate([
    (0, common_1.Post)(':userId/note'),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, users_dto_1.UserNoteDto]),
    __metadata("design:returntype", void 0)
], UsersAdminController.prototype, "setNote", null);
exports.UsersAdminController = UsersAdminController = __decorate([
    (0, common_1.Controller)('api/v1/admin/users'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, users_module_guard_1.UsersModuleGuard),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersAdminController);
//# sourceMappingURL=users-admin.controller.js.map