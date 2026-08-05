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
exports.OverviewAdminController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const overview_module_guard_1 = require("./overview-module.guard");
const overview_service_1 = require("./overview.service");
const overview_series_1 = require("./overview-series");
let OverviewAdminController = class OverviewAdminController {
    overview;
    constructor(overview) {
        this.overview = overview;
    }
    snapshot() {
        return this.overview.adminSnapshot();
    }
    series(range) {
        return this.overview.adminSeries((0, overview_series_1.parseOverviewSeriesRange)(range));
    }
};
exports.OverviewAdminController = OverviewAdminController;
__decorate([
    (0, common_1.Get)(),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], OverviewAdminController.prototype, "snapshot", null);
__decorate([
    (0, common_1.Get)('series'),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    __param(0, (0, common_1.Query)('range')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OverviewAdminController.prototype, "series", null);
exports.OverviewAdminController = OverviewAdminController = __decorate([
    (0, common_1.Controller)('api/v1/admin/overview'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, overview_module_guard_1.OverviewModuleGuard),
    __metadata("design:paramtypes", [overview_service_1.OverviewService])
], OverviewAdminController);
//# sourceMappingURL=overview-admin.controller.js.map