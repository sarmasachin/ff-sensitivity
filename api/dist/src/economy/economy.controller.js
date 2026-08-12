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
exports.EconomyController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const user_jwt_auth_guard_1 = require("../user-auth/user-jwt-auth.guard");
const current_user_decorator_1 = require("../user-auth/current-user.decorator");
const economy_service_1 = require("./economy.service");
const economy_dto_1 = require("./dto/economy.dto");
let EconomyController = class EconomyController {
    economy;
    constructor(economy) {
        this.economy = economy;
    }
    wallet(user) {
        return this.economy.getWallet(user.id);
    }
    earn(user, dto) {
        return this.economy.earnChallenge(user.id, dto.kind, {
            correct: dto.correct,
            milestoneDays: dto.milestoneDays,
        });
    }
    purchase(user, dto) {
        return this.economy.purchaseShop(user.id, dto.itemId, dto.requestId);
    }
    shopCatalog() {
        return this.economy.shopCatalog();
    }
};
exports.EconomyController = EconomyController;
__decorate([
    (0, common_1.Get)('wallet'),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EconomyController.prototype, "wallet", null);
__decorate([
    (0, common_1.Post)('challenge/earn'),
    (0, throttler_1.Throttle)({ default: { limit: 40, ttl: 60_000 } }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, economy_dto_1.ChallengeEarnDto]),
    __metadata("design:returntype", void 0)
], EconomyController.prototype, "earn", null);
__decorate([
    (0, common_1.Post)('shop/purchase'),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60_000 } }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, economy_dto_1.ShopPurchaseDto]),
    __metadata("design:returntype", void 0)
], EconomyController.prototype, "purchase", null);
__decorate([
    (0, common_1.Get)('shop/catalog'),
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60_000 } }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], EconomyController.prototype, "shopCatalog", null);
exports.EconomyController = EconomyController = __decorate([
    (0, common_1.Controller)('api/v1/economy'),
    (0, common_1.UseGuards)(user_jwt_auth_guard_1.UserJwtAuthGuard),
    __metadata("design:paramtypes", [economy_service_1.EconomyService])
], EconomyController);
//# sourceMappingURL=economy.controller.js.map