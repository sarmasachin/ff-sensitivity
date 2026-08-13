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
exports.RedeemController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const user_jwt_auth_guard_1 = require("../user-auth/user-jwt-auth.guard");
const current_user_decorator_1 = require("../user-auth/current-user.decorator");
const redeem_service_1 = require("./redeem.service");
const redeem_scratch_dto_1 = require("./dto/redeem-scratch.dto");
let RedeemController = class RedeemController {
    redeem;
    constructor(redeem) {
        this.redeem = redeem;
    }
    catalog(user) {
        return this.redeem.catalog(user.id);
    }
    myClaims(user) {
        return this.redeem.myClaims(user.id);
    }
    scratch(user, id, dto) {
        return this.redeem.scratch(user.id, id, dto.attemptKey);
    }
    scratchAdUnlock(user, id) {
        return this.redeem.scratchAdUnlock(user.id, id);
    }
    claim(user, id) {
        return this.redeem.claim(user.id, id);
    }
};
exports.RedeemController = RedeemController;
__decorate([
    (0, common_1.Get)('catalog'),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RedeemController.prototype, "catalog", null);
__decorate([
    (0, common_1.Get)('claims'),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RedeemController.prototype, "myClaims", null);
__decorate([
    (0, common_1.Post)(':id/scratch'),
    (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60_000 } }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, redeem_scratch_dto_1.ScratchRedeemDto]),
    __metadata("design:returntype", void 0)
], RedeemController.prototype, "scratch", null);
__decorate([
    (0, common_1.Post)(':id/scratch-ad-unlock'),
    (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60_000 } }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RedeemController.prototype, "scratchAdUnlock", null);
__decorate([
    (0, common_1.Post)(':id/claim'),
    (0, throttler_1.Throttle)({ default: { limit: 15, ttl: 60_000 } }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RedeemController.prototype, "claim", null);
exports.RedeemController = RedeemController = __decorate([
    (0, common_1.Controller)('api/v1/redeem'),
    (0, common_1.UseGuards)(user_jwt_auth_guard_1.UserJwtAuthGuard),
    __metadata("design:paramtypes", [redeem_service_1.RedeemService])
], RedeemController);
//# sourceMappingURL=redeem.controller.js.map