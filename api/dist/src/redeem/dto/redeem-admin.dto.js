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
exports.RevealRedeemCodeDto = exports.UpdateRedeemCodeDto = exports.CreateRedeemCodeDto = void 0;
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
const MSG = {
    title: 'Title must be 2-80 characters.',
    type: 'Choose a valid redeem type.',
    valueLabel: 'Value label is required (max 40 characters).',
    codeSecret: 'Code secret must be 8-80 characters.',
    status: 'Choose a valid status.',
    cadence: 'Choose a valid cadence.',
    stock: 'Stock must be 0 or 1.',
    coinCost: 'Coin cost must be 0 or higher.',
    expiresLabel: 'Expires label must be at most 40 characters.',
    tip: 'Tip must be at most 120 characters.',
    redeemUrl: 'Redeem URL must be at most 200 characters.',
    password: 'Current password must be 6-128 characters.',
};
class CreateRedeemCodeDto {
    title;
    type;
    valueLabel;
    codeSecret;
    status;
    cadence;
    stockLeft;
    coinCost;
    expiresLabel;
    tip;
    redeemUrl;
}
exports.CreateRedeemCodeDto = CreateRedeemCodeDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: MSG.title }),
    (0, class_validator_1.MaxLength)(80, { message: MSG.title }),
    __metadata("design:type", String)
], CreateRedeemCodeDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.RedeemType, { message: MSG.type }),
    __metadata("design:type", String)
], CreateRedeemCodeDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: MSG.valueLabel }),
    (0, class_validator_1.MaxLength)(40, { message: MSG.valueLabel }),
    __metadata("design:type", String)
], CreateRedeemCodeDto.prototype, "valueLabel", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8, { message: MSG.codeSecret }),
    (0, class_validator_1.MaxLength)(80, { message: MSG.codeSecret }),
    __metadata("design:type", String)
], CreateRedeemCodeDto.prototype, "codeSecret", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.RedeemCodeStatus, { message: MSG.status }),
    __metadata("design:type", String)
], CreateRedeemCodeDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.RedeemCadence, { message: MSG.cadence }),
    __metadata("design:type", String)
], CreateRedeemCodeDto.prototype, "cadence", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0, { message: MSG.stock }),
    (0, class_validator_1.Max)(1, { message: MSG.stock }),
    __metadata("design:type", Number)
], CreateRedeemCodeDto.prototype, "stockLeft", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_, v) => v !== null),
    (0, class_validator_1.IsInt)({ message: MSG.coinCost }),
    (0, class_validator_1.Min)(0, { message: MSG.coinCost }),
    (0, class_validator_1.Max)(999999, { message: MSG.coinCost }),
    __metadata("design:type", Object)
], CreateRedeemCodeDto.prototype, "coinCost", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(40, { message: MSG.expiresLabel }),
    __metadata("design:type", String)
], CreateRedeemCodeDto.prototype, "expiresLabel", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120, { message: MSG.tip }),
    __metadata("design:type", String)
], CreateRedeemCodeDto.prototype, "tip", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200, { message: MSG.redeemUrl }),
    __metadata("design:type", String)
], CreateRedeemCodeDto.prototype, "redeemUrl", void 0);
class UpdateRedeemCodeDto {
    title;
    type;
    valueLabel;
    codeSecret;
    status;
    cadence;
    stockLeft;
    coinCost;
    expiresLabel;
    tip;
    redeemUrl;
}
exports.UpdateRedeemCodeDto = UpdateRedeemCodeDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: MSG.title }),
    (0, class_validator_1.MaxLength)(80, { message: MSG.title }),
    __metadata("design:type", String)
], UpdateRedeemCodeDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.RedeemType, { message: MSG.type }),
    __metadata("design:type", String)
], UpdateRedeemCodeDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: MSG.valueLabel }),
    (0, class_validator_1.MaxLength)(40, { message: MSG.valueLabel }),
    __metadata("design:type", String)
], UpdateRedeemCodeDto.prototype, "valueLabel", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8, { message: MSG.codeSecret }),
    (0, class_validator_1.MaxLength)(80, { message: MSG.codeSecret }),
    __metadata("design:type", String)
], UpdateRedeemCodeDto.prototype, "codeSecret", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.RedeemCodeStatus, { message: MSG.status }),
    __metadata("design:type", String)
], UpdateRedeemCodeDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.RedeemCadence, { message: MSG.cadence }),
    __metadata("design:type", String)
], UpdateRedeemCodeDto.prototype, "cadence", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0, { message: MSG.stock }),
    (0, class_validator_1.Max)(1, { message: MSG.stock }),
    __metadata("design:type", Number)
], UpdateRedeemCodeDto.prototype, "stockLeft", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_, v) => v !== null),
    (0, class_validator_1.IsInt)({ message: MSG.coinCost }),
    (0, class_validator_1.Min)(0, { message: MSG.coinCost }),
    (0, class_validator_1.Max)(999999, { message: MSG.coinCost }),
    __metadata("design:type", Object)
], UpdateRedeemCodeDto.prototype, "coinCost", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(40, { message: MSG.expiresLabel }),
    __metadata("design:type", String)
], UpdateRedeemCodeDto.prototype, "expiresLabel", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120, { message: MSG.tip }),
    __metadata("design:type", String)
], UpdateRedeemCodeDto.prototype, "tip", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200, { message: MSG.redeemUrl }),
    __metadata("design:type", String)
], UpdateRedeemCodeDto.prototype, "redeemUrl", void 0);
class RevealRedeemCodeDto {
    currentPassword;
}
exports.RevealRedeemCodeDto = RevealRedeemCodeDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(6, { message: MSG.password }),
    (0, class_validator_1.MaxLength)(128, { message: MSG.password }),
    __metadata("design:type", String)
], RevealRedeemCodeDto.prototype, "currentPassword", void 0);
//# sourceMappingURL=redeem-admin.dto.js.map