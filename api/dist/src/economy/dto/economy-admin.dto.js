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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaveEconomyDto = exports.EconomyPremiumUnlockDto = exports.EconomyLimitsDto = exports.EconomyEarnDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class EconomyEarnDto {
    checkInCoins;
    quizCorrectCoins;
    quizWrongCoins;
    adBonusCoins;
}
exports.EconomyEarnDto = EconomyEarnDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100_000),
    __metadata("design:type", Number)
], EconomyEarnDto.prototype, "checkInCoins", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(9999),
    __metadata("design:type", Number)
], EconomyEarnDto.prototype, "quizCorrectCoins", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(9999),
    __metadata("design:type", Number)
], EconomyEarnDto.prototype, "quizWrongCoins", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100_000),
    __metadata("design:type", Number)
], EconomyEarnDto.prototype, "adBonusCoins", void 0);
class EconomyLimitsDto {
    walletCap;
    dailyEarnCap;
}
exports.EconomyLimitsDto = EconomyLimitsDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(100),
    (0, class_validator_1.Max)(9_999_999),
    __metadata("design:type", Number)
], EconomyLimitsDto.prototype, "walletCap", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(9_999_999),
    __metadata("design:type", Number)
], EconomyLimitsDto.prototype, "dailyEarnCap", void 0);
class EconomyPremiumUnlockDto {
    bestPremium;
    premiumProMax;
    oneTapPremium;
    coinUnlockEnabled;
    adUnlockEnabled;
}
exports.EconomyPremiumUnlockDto = EconomyPremiumUnlockDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100_000),
    __metadata("design:type", Number)
], EconomyPremiumUnlockDto.prototype, "bestPremium", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100_000),
    __metadata("design:type", Number)
], EconomyPremiumUnlockDto.prototype, "premiumProMax", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100_000),
    __metadata("design:type", Number)
], EconomyPremiumUnlockDto.prototype, "oneTapPremium", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], EconomyPremiumUnlockDto.prototype, "coinUnlockEnabled", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], EconomyPremiumUnlockDto.prototype, "adUnlockEnabled", void 0);
class SaveEconomyDto {
    earn;
    limits;
    premiumUnlock;
    checkInEnabled;
    quizEnabled;
    adBonusEnabled;
}
exports.SaveEconomyDto = SaveEconomyDto;
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => EconomyEarnDto),
    __metadata("design:type", EconomyEarnDto)
], SaveEconomyDto.prototype, "earn", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => EconomyLimitsDto),
    __metadata("design:type", EconomyLimitsDto)
], SaveEconomyDto.prototype, "limits", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => EconomyPremiumUnlockDto),
    __metadata("design:type", EconomyPremiumUnlockDto)
], SaveEconomyDto.prototype, "premiumUnlock", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SaveEconomyDto.prototype, "checkInEnabled", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SaveEconomyDto.prototype, "quizEnabled", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SaveEconomyDto.prototype, "adBonusEnabled", void 0);
//# sourceMappingURL=economy-admin.dto.js.map