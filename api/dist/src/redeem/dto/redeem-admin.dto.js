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
exports.RevealRedeemCodeDto = exports.AppendRedeemPoolDto = exports.UpdateRedeemCodeDto = exports.CreateRedeemCodeDto = exports.UpdateRedeemCadenceDto = exports.CreateRedeemCadenceDto = exports.UpdateRedeemTypeDto = exports.CreateRedeemTypeDto = void 0;
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
const MSG = {
    title: 'Title must be 2-80 characters.',
    type: 'Choose a valid redeem type.',
    valueLabel: 'Value label is required (max 40 characters).',
    codeSecret: 'Code secret must be 8-80 characters.',
    status: 'Choose a valid status.',
    cadence: 'Choose a valid cadence.',
    mode: 'Choose Single or Scratch reward mode.',
    stock: 'Stock must be 0 or 1.',
    coinCost: 'Coin cost must be 0 or higher.',
    coinReward: 'Coin reward must be 0-10000.',
    window: 'Window minutes must be 5-240.',
    codesPerWindow: 'Codes per window must be 1-20.',
    expiresLabel: 'Expires label must be at most 40 characters.',
    tip: 'Tip must be at most 120 characters.',
    redeemUrl: 'Redeem URL must be at most 200 characters.',
    password: 'Current password must be 6-128 characters.',
    pool: 'Paste at least one code (8-80 chars each, one per line).',
    defId: 'Id must start with a letter and use A-Z, 0-9, underscore only (2-32).',
    defLabel: 'Label must be 2-40 characters.',
    sortOrder: 'Sort order must be between 0 and 9999.',
    claimLimit: 'Claim limit must be 1–100.',
    windowHours: 'Window hours must be 1–8760.',
};
const DEF_ID = /^[A-Z][A-Z0-9_]*$/;
class CreateRedeemTypeDto {
    id;
    label;
    sortOrder;
    enabled;
}
exports.CreateRedeemTypeDto = CreateRedeemTypeDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: MSG.defId }),
    (0, class_validator_1.MaxLength)(32, { message: MSG.defId }),
    (0, class_validator_1.Matches)(DEF_ID, { message: MSG.defId }),
    __metadata("design:type", String)
], CreateRedeemTypeDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: MSG.defLabel }),
    (0, class_validator_1.MaxLength)(40, { message: MSG.defLabel }),
    __metadata("design:type", String)
], CreateRedeemTypeDto.prototype, "label", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0, { message: MSG.sortOrder }),
    (0, class_validator_1.Max)(9999, { message: MSG.sortOrder }),
    __metadata("design:type", Number)
], CreateRedeemTypeDto.prototype, "sortOrder", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateRedeemTypeDto.prototype, "enabled", void 0);
class UpdateRedeemTypeDto {
    label;
    sortOrder;
    enabled;
}
exports.UpdateRedeemTypeDto = UpdateRedeemTypeDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: MSG.defLabel }),
    (0, class_validator_1.MaxLength)(40, { message: MSG.defLabel }),
    __metadata("design:type", String)
], UpdateRedeemTypeDto.prototype, "label", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0, { message: MSG.sortOrder }),
    (0, class_validator_1.Max)(9999, { message: MSG.sortOrder }),
    __metadata("design:type", Number)
], UpdateRedeemTypeDto.prototype, "sortOrder", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateRedeemTypeDto.prototype, "enabled", void 0);
class CreateRedeemCadenceDto {
    id;
    label;
    claimLimit;
    windowHours;
    sortOrder;
    enabled;
}
exports.CreateRedeemCadenceDto = CreateRedeemCadenceDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: MSG.defId }),
    (0, class_validator_1.MaxLength)(32, { message: MSG.defId }),
    (0, class_validator_1.Matches)(DEF_ID, { message: MSG.defId }),
    __metadata("design:type", String)
], CreateRedeemCadenceDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: MSG.defLabel }),
    (0, class_validator_1.MaxLength)(40, { message: MSG.defLabel }),
    __metadata("design:type", String)
], CreateRedeemCadenceDto.prototype, "label", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: MSG.claimLimit }),
    (0, class_validator_1.Min)(1, { message: MSG.claimLimit }),
    (0, class_validator_1.Max)(100, { message: MSG.claimLimit }),
    __metadata("design:type", Number)
], CreateRedeemCadenceDto.prototype, "claimLimit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: MSG.windowHours }),
    (0, class_validator_1.Min)(1, { message: MSG.windowHours }),
    (0, class_validator_1.Max)(8760, { message: MSG.windowHours }),
    __metadata("design:type", Number)
], CreateRedeemCadenceDto.prototype, "windowHours", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0, { message: MSG.sortOrder }),
    (0, class_validator_1.Max)(9999, { message: MSG.sortOrder }),
    __metadata("design:type", Number)
], CreateRedeemCadenceDto.prototype, "sortOrder", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateRedeemCadenceDto.prototype, "enabled", void 0);
class UpdateRedeemCadenceDto {
    label;
    claimLimit;
    windowHours;
    sortOrder;
    enabled;
}
exports.UpdateRedeemCadenceDto = UpdateRedeemCadenceDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: MSG.defLabel }),
    (0, class_validator_1.MaxLength)(40, { message: MSG.defLabel }),
    __metadata("design:type", String)
], UpdateRedeemCadenceDto.prototype, "label", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: MSG.claimLimit }),
    (0, class_validator_1.Min)(1, { message: MSG.claimLimit }),
    (0, class_validator_1.Max)(100, { message: MSG.claimLimit }),
    __metadata("design:type", Number)
], UpdateRedeemCadenceDto.prototype, "claimLimit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: MSG.windowHours }),
    (0, class_validator_1.Min)(1, { message: MSG.windowHours }),
    (0, class_validator_1.Max)(8760, { message: MSG.windowHours }),
    __metadata("design:type", Number)
], UpdateRedeemCadenceDto.prototype, "windowHours", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0, { message: MSG.sortOrder }),
    (0, class_validator_1.Max)(9999, { message: MSG.sortOrder }),
    __metadata("design:type", Number)
], UpdateRedeemCadenceDto.prototype, "sortOrder", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateRedeemCadenceDto.prototype, "enabled", void 0);
class CreateRedeemCodeDto {
    mode;
    title;
    type;
    valueLabel;
    codeSecret;
    codePool;
    status;
    cadence;
    stockLeft;
    coinCost;
    coinRewardMin;
    coinRewardMax;
    startsAt;
    endsAt;
    windowMinutes;
    codesPerWindow;
    expiresLabel;
    tip;
    redeemUrl;
}
exports.CreateRedeemCodeDto = CreateRedeemCodeDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.RedeemMode, { message: MSG.mode }),
    __metadata("design:type", String)
], CreateRedeemCodeDto.prototype, "mode", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: MSG.title }),
    (0, class_validator_1.MaxLength)(80, { message: MSG.title }),
    __metadata("design:type", String)
], CreateRedeemCodeDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)({ message: MSG.type }),
    (0, class_validator_1.MinLength)(2, { message: MSG.type }),
    (0, class_validator_1.MaxLength)(32, { message: MSG.type }),
    (0, class_validator_1.Matches)(DEF_ID, { message: MSG.type }),
    __metadata("design:type", String)
], CreateRedeemCodeDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: MSG.valueLabel }),
    (0, class_validator_1.MaxLength)(40, { message: MSG.valueLabel }),
    __metadata("design:type", String)
], CreateRedeemCodeDto.prototype, "valueLabel", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => (o.mode ?? client_1.RedeemMode.SINGLE) === client_1.RedeemMode.SINGLE),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8, { message: MSG.codeSecret }),
    (0, class_validator_1.MaxLength)(80, { message: MSG.codeSecret }),
    __metadata("design:type", String)
], CreateRedeemCodeDto.prototype, "codeSecret", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => (o.mode ?? client_1.RedeemMode.SINGLE) === client_1.RedeemMode.SCRATCH_REWARD),
    (0, class_validator_1.IsArray)({ message: MSG.pool }),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateRedeemCodeDto.prototype, "codePool", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.RedeemCodeStatus, { message: MSG.status }),
    __metadata("design:type", String)
], CreateRedeemCodeDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsString)({ message: MSG.cadence }),
    (0, class_validator_1.MinLength)(2, { message: MSG.cadence }),
    (0, class_validator_1.MaxLength)(32, { message: MSG.cadence }),
    (0, class_validator_1.Matches)(DEF_ID, { message: MSG.cadence }),
    __metadata("design:type", String)
], CreateRedeemCodeDto.prototype, "cadence", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => (o.mode ?? client_1.RedeemMode.SINGLE) === client_1.RedeemMode.SINGLE),
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
    (0, class_validator_1.ValidateIf)((o) => (o.mode ?? client_1.RedeemMode.SINGLE) === client_1.RedeemMode.SCRATCH_REWARD),
    (0, class_validator_1.IsInt)({ message: MSG.coinReward }),
    (0, class_validator_1.Min)(0, { message: MSG.coinReward }),
    (0, class_validator_1.Max)(10000, { message: MSG.coinReward }),
    __metadata("design:type", Number)
], CreateRedeemCodeDto.prototype, "coinRewardMin", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => (o.mode ?? client_1.RedeemMode.SINGLE) === client_1.RedeemMode.SCRATCH_REWARD),
    (0, class_validator_1.IsInt)({ message: MSG.coinReward }),
    (0, class_validator_1.Min)(0, { message: MSG.coinReward }),
    (0, class_validator_1.Max)(10000, { message: MSG.coinReward }),
    __metadata("design:type", Number)
], CreateRedeemCodeDto.prototype, "coinRewardMax", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)({}, { message: 'Start time must be a valid date.' }),
    __metadata("design:type", String)
], CreateRedeemCodeDto.prototype, "startsAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)({}, { message: 'End time must be a valid date.' }),
    __metadata("design:type", String)
], CreateRedeemCodeDto.prototype, "endsAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: MSG.window }),
    (0, class_validator_1.Min)(5, { message: MSG.window }),
    (0, class_validator_1.Max)(240, { message: MSG.window }),
    __metadata("design:type", Number)
], CreateRedeemCodeDto.prototype, "windowMinutes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: MSG.codesPerWindow }),
    (0, class_validator_1.Min)(1, { message: MSG.codesPerWindow }),
    (0, class_validator_1.Max)(20, { message: MSG.codesPerWindow }),
    __metadata("design:type", Number)
], CreateRedeemCodeDto.prototype, "codesPerWindow", void 0);
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
    codePool;
    status;
    cadence;
    stockLeft;
    coinCost;
    coinRewardMin;
    coinRewardMax;
    startsAt;
    endsAt;
    windowMinutes;
    codesPerWindow;
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
    (0, class_validator_1.IsString)({ message: MSG.type }),
    (0, class_validator_1.MinLength)(2, { message: MSG.type }),
    (0, class_validator_1.MaxLength)(32, { message: MSG.type }),
    (0, class_validator_1.Matches)(DEF_ID, { message: MSG.type }),
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
    (0, class_validator_1.IsArray)({ message: MSG.pool }),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UpdateRedeemCodeDto.prototype, "codePool", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.RedeemCodeStatus, { message: MSG.status }),
    __metadata("design:type", String)
], UpdateRedeemCodeDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: MSG.cadence }),
    (0, class_validator_1.MinLength)(2, { message: MSG.cadence }),
    (0, class_validator_1.MaxLength)(32, { message: MSG.cadence }),
    (0, class_validator_1.Matches)(DEF_ID, { message: MSG.cadence }),
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
    (0, class_validator_1.IsInt)({ message: MSG.coinReward }),
    (0, class_validator_1.Min)(0, { message: MSG.coinReward }),
    (0, class_validator_1.Max)(10000, { message: MSG.coinReward }),
    __metadata("design:type", Number)
], UpdateRedeemCodeDto.prototype, "coinRewardMin", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: MSG.coinReward }),
    (0, class_validator_1.Min)(0, { message: MSG.coinReward }),
    (0, class_validator_1.Max)(10000, { message: MSG.coinReward }),
    __metadata("design:type", Number)
], UpdateRedeemCodeDto.prototype, "coinRewardMax", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_, v) => v !== null),
    (0, class_validator_1.IsDateString)({}, { message: 'Start time must be a valid date.' }),
    __metadata("design:type", Object)
], UpdateRedeemCodeDto.prototype, "startsAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_, v) => v !== null),
    (0, class_validator_1.IsDateString)({}, { message: 'End time must be a valid date.' }),
    __metadata("design:type", Object)
], UpdateRedeemCodeDto.prototype, "endsAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: MSG.window }),
    (0, class_validator_1.Min)(5, { message: MSG.window }),
    (0, class_validator_1.Max)(240, { message: MSG.window }),
    __metadata("design:type", Number)
], UpdateRedeemCodeDto.prototype, "windowMinutes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: MSG.codesPerWindow }),
    (0, class_validator_1.Min)(1, { message: MSG.codesPerWindow }),
    (0, class_validator_1.Max)(20, { message: MSG.codesPerWindow }),
    __metadata("design:type", Number)
], UpdateRedeemCodeDto.prototype, "codesPerWindow", void 0);
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
class AppendRedeemPoolDto {
    codePool;
}
exports.AppendRedeemPoolDto = AppendRedeemPoolDto;
__decorate([
    (0, class_validator_1.IsArray)({ message: MSG.pool }),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], AppendRedeemPoolDto.prototype, "codePool", void 0);
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