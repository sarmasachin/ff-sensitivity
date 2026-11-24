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
exports.CompareController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const user_jwt_auth_guard_1 = require("../user-auth/user-jwt-auth.guard");
const current_user_decorator_1 = require("../user-auth/current-user.decorator");
const compare_service_1 = require("./compare.service");
const compare_dto_1 = require("./dto/compare.dto");
let CompareController = class CompareController {
    compare;
    constructor(compare) {
        this.compare = compare;
    }
    list(fingers, role) {
        return this.compare.list(fingers, role);
    }
    promaxOffset(user, fingers, role, deviceLabel, ramGb, processorBrand, processorType, gpuLabel, gpuVendor, dpiPreference, screenGuard, refreshHz, engine) {
        const ramParsed = ramGb != null && ramGb !== '' ? Number(ramGb) : undefined;
        const hzParsed = refreshHz != null && refreshHz !== '' ? Number(refreshHz) : undefined;
        return this.compare.promaxOffset({
            fingers,
            role,
            deviceLabel,
            ramGb: Number.isFinite(ramParsed) ? ramParsed : undefined,
            processorBrand,
            processorType,
            gpuLabel,
            gpuVendor,
            dpiPreference,
            screenGuard,
            refreshHz: Number.isFinite(hzParsed) ? hzParsed : undefined,
            excludeUserId: user.id,
            engine: engine?.trim() || 'promax',
        });
    }
    save(user, dto) {
        return this.compare.save(user.id, dto);
    }
};
exports.CompareController = CompareController;
__decorate([
    (0, common_1.Get)(),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    __param(0, (0, common_1.Query)('fingers')),
    __param(1, (0, common_1.Query)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompareController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('promax-offset'),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('fingers')),
    __param(2, (0, common_1.Query)('role')),
    __param(3, (0, common_1.Query)('deviceLabel')),
    __param(4, (0, common_1.Query)('ramGb')),
    __param(5, (0, common_1.Query)('processorBrand')),
    __param(6, (0, common_1.Query)('processorType')),
    __param(7, (0, common_1.Query)('gpuLabel')),
    __param(8, (0, common_1.Query)('gpuVendor')),
    __param(9, (0, common_1.Query)('dpiPreference')),
    __param(10, (0, common_1.Query)('screenGuard')),
    __param(11, (0, common_1.Query)('refreshHz')),
    __param(12, (0, common_1.Query)('engine')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], CompareController.prototype, "promaxOffset", null);
__decorate([
    (0, common_1.Post)(),
    (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60_000 } }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, compare_dto_1.SaveCompareDto]),
    __metadata("design:returntype", void 0)
], CompareController.prototype, "save", null);
exports.CompareController = CompareController = __decorate([
    (0, common_1.Controller)('api/v1/compare'),
    (0, common_1.UseGuards)(user_jwt_auth_guard_1.UserJwtAuthGuard),
    __metadata("design:paramtypes", [compare_service_1.CompareService])
], CompareController);
//# sourceMappingURL=compare.controller.js.map