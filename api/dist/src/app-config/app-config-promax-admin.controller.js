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
exports.AppConfigProMaxAdminController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const client_1 = require("@prisma/client");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_admin_decorator_1 = require("../auth/current-admin.decorator");
const app_error_1 = require("../common/errors/app-error");
const app_config_module_guard_1 = require("./app-config-module.guard");
const app_config_service_1 = require("./app-config.service");
const promax_config_dto_1 = require("./dto/promax-config.dto");
let AppConfigProMaxAdminController = class AppConfigProMaxAdminController {
    appConfig;
    constructor(appConfig) {
        this.appConfig = appConfig;
    }
    get() {
        return this.appConfig.adminGetProMax();
    }
    save(admin, dto) {
        if (admin.role === client_1.AdminRole.VIEWER) {
            throw new app_error_1.AppError('FORBIDDEN_ROLE', 'Viewers cannot change ProMax config.', 403);
        }
        return this.appConfig.adminSaveProMax(admin.id, dto);
    }
};
exports.AppConfigProMaxAdminController = AppConfigProMaxAdminController;
__decorate([
    (0, common_1.Get)(),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppConfigProMaxAdminController.prototype, "get", null);
__decorate([
    (0, common_1.Put)(),
    (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, promax_config_dto_1.SaveProMaxConfigDto]),
    __metadata("design:returntype", void 0)
], AppConfigProMaxAdminController.prototype, "save", null);
exports.AppConfigProMaxAdminController = AppConfigProMaxAdminController = __decorate([
    (0, common_1.Controller)('api/v1/admin/promax'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, app_config_module_guard_1.AppConfigModuleGuard),
    __metadata("design:paramtypes", [app_config_service_1.AppConfigService])
], AppConfigProMaxAdminController);
//# sourceMappingURL=app-config-promax-admin.controller.js.map