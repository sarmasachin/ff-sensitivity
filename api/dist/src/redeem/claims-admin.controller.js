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
exports.ClaimsAdminController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const current_admin_decorator_1 = require("../auth/current-admin.decorator");
const app_error_1 = require("../common/errors/app-error");
const claims_module_guard_1 = require("./claims-module.guard");
const claims_admin_dto_1 = require("./dto/claims-admin.dto");
const redeem_claims_service_1 = require("./redeem-claims.service");
let ClaimsAdminController = class ClaimsAdminController {
    claims;
    constructor(claims) {
        this.claims = claims;
    }
    list(q) {
        return this.claims.adminListClaims(q);
    }
    stats() {
        return this.claims.adminClaimsStats();
    }
    reveal(admin, id, dto) {
        if (!id?.trim() || id.includes('/')) {
            throw new app_error_1.AppError('CLAIM_BAD_ID', 'Invalid claim id.', 400);
        }
        return this.claims.adminRevealClaim(admin.id, id.trim(), dto.currentPassword);
    }
    flag(admin, id, dto) {
        if (!id?.trim() || id.includes('/')) {
            throw new app_error_1.AppError('CLAIM_BAD_ID', 'Invalid claim id.', 400);
        }
        return this.claims.adminFlagClaim(admin.id, id.trim(), dto.flagged, dto.note);
    }
    remove(admin, id) {
        if (!id?.trim() || id.includes('/')) {
            throw new app_error_1.AppError('CLAIM_BAD_ID', 'Invalid claim id.', 400);
        }
        return this.claims.adminDeleteClaim(admin.id, id.trim());
    }
};
exports.ClaimsAdminController = ClaimsAdminController;
__decorate([
    (0, common_1.Get)(),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ClaimsAdminController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ClaimsAdminController.prototype, "stats", null);
__decorate([
    (0, common_1.Post)(':id/reveal'),
    (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, claims_admin_dto_1.RevealClaimDto]),
    __metadata("design:returntype", void 0)
], ClaimsAdminController.prototype, "reveal", null);
__decorate([
    (0, common_1.Patch)(':id/flag'),
    (0, throttler_1.Throttle)({ default: { limit: 40, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, claims_admin_dto_1.FlagClaimDto]),
    __metadata("design:returntype", void 0)
], ClaimsAdminController.prototype, "flag", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60_000 } }),
    __param(0, (0, current_admin_decorator_1.CurrentAdmin)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ClaimsAdminController.prototype, "remove", null);
exports.ClaimsAdminController = ClaimsAdminController = __decorate([
    (0, common_1.Controller)('api/v1/admin/claims'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, claims_module_guard_1.ClaimsModuleGuard),
    __metadata("design:paramtypes", [redeem_claims_service_1.RedeemClaimsService])
], ClaimsAdminController);
//# sourceMappingURL=claims-admin.controller.js.map