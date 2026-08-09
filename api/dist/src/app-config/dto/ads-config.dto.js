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
exports.SaveAdsConfigDto = exports.AdPlacementDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class AdPlacementDto {
    enabled;
    cooldownHours;
    incompleteMessage;
    buttonLabel;
}
exports.AdPlacementDto = AdPlacementDto;
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], AdPlacementDto.prototype, "enabled", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(168),
    __metadata("design:type", Number)
], AdPlacementDto.prototype, "cooldownHours", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], AdPlacementDto.prototype, "incompleteMessage", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], AdPlacementDto.prototype, "buttonLabel", void 0);
class SaveAdsConfigDto {
    calculate;
    dpi;
    quiz;
    secondChance;
    adBonus;
    checkIn;
    redeemDaily;
}
exports.SaveAdsConfigDto = SaveAdsConfigDto;
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => AdPlacementDto),
    __metadata("design:type", AdPlacementDto)
], SaveAdsConfigDto.prototype, "calculate", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => AdPlacementDto),
    __metadata("design:type", AdPlacementDto)
], SaveAdsConfigDto.prototype, "dpi", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => AdPlacementDto),
    __metadata("design:type", AdPlacementDto)
], SaveAdsConfigDto.prototype, "quiz", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => AdPlacementDto),
    __metadata("design:type", AdPlacementDto)
], SaveAdsConfigDto.prototype, "secondChance", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => AdPlacementDto),
    __metadata("design:type", AdPlacementDto)
], SaveAdsConfigDto.prototype, "adBonus", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => AdPlacementDto),
    __metadata("design:type", AdPlacementDto)
], SaveAdsConfigDto.prototype, "checkIn", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => AdPlacementDto),
    __metadata("design:type", AdPlacementDto)
], SaveAdsConfigDto.prototype, "redeemDaily", void 0);
//# sourceMappingURL=ads-config.dto.js.map