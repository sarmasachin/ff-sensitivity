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
exports.SaveScratchDto = exports.ScratchPrizeDto = exports.ScratchPolicyDto = exports.ScratchOutcomeOddsDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class ScratchOutcomeOddsDto {
    coinsPercent;
    redeemPercent;
    coinAmount;
}
exports.ScratchOutcomeOddsDto = ScratchOutcomeOddsDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], ScratchOutcomeOddsDto.prototype, "coinsPercent", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], ScratchOutcomeOddsDto.prototype, "redeemPercent", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100_000),
    __metadata("design:type", Number)
], ScratchOutcomeOddsDto.prototype, "coinAmount", void 0);
class ScratchPolicyDto {
    retentionDays;
    autoPurge;
    showExpired;
}
exports.ScratchPolicyDto = ScratchPolicyDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(365),
    __metadata("design:type", Number)
], ScratchPolicyDto.prototype, "retentionDays", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ScratchPolicyDto.prototype, "autoPurge", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ScratchPolicyDto.prototype, "showExpired", void 0);
class ScratchPrizeDto {
    id;
    title;
    detail;
    kind;
    rewardLabel;
    coinReward;
    oddsPercent;
    enabled;
    streakDays;
}
exports.ScratchPrizeDto = ScratchPrizeDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(64),
    __metadata("design:type", String)
], ScratchPrizeDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], ScratchPrizeDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(240),
    __metadata("design:type", String)
], ScratchPrizeDto.prototype, "detail", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['MILESTONE', 'REDEEM', 'SHOP', 'GIFT']),
    __metadata("design:type", String)
], ScratchPrizeDto.prototype, "kind", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], ScratchPrizeDto.prototype, "rewardLabel", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100_000),
    __metadata("design:type", Number)
], ScratchPrizeDto.prototype, "coinReward", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], ScratchPrizeDto.prototype, "oddsPercent", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ScratchPrizeDto.prototype, "enabled", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(365),
    __metadata("design:type", Object)
], ScratchPrizeDto.prototype, "streakDays", void 0);
class SaveScratchDto {
    outcomeOdds;
    policy;
    prizes;
}
exports.SaveScratchDto = SaveScratchDto;
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ScratchOutcomeOddsDto),
    __metadata("design:type", ScratchOutcomeOddsDto)
], SaveScratchDto.prototype, "outcomeOdds", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ScratchPolicyDto),
    __metadata("design:type", ScratchPolicyDto)
], SaveScratchDto.prototype, "policy", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ScratchPrizeDto),
    __metadata("design:type", Array)
], SaveScratchDto.prototype, "prizes", void 0);
//# sourceMappingURL=scratch.dto.js.map