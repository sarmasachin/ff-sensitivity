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
exports.SaveAppConfigDto = exports.AppLinksDto = exports.AppStatusDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class AppStatusDto {
    maintenanceMode;
    maintenanceMessage;
    forceUpdate;
    softUpdatePrompt;
    minVersionCode;
    minVersionName;
}
exports.AppStatusDto = AppStatusDto;
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], AppStatusDto.prototype, "maintenanceMode", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(400),
    __metadata("design:type", String)
], AppStatusDto.prototype, "maintenanceMessage", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], AppStatusDto.prototype, "forceUpdate", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], AppStatusDto.prototype, "softUpdatePrompt", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(999999),
    __metadata("design:type", Number)
], AppStatusDto.prototype, "minVersionCode", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(32),
    __metadata("design:type", String)
], AppStatusDto.prototype, "minVersionName", void 0);
class AppLinksDto {
    playStoreUrl;
    privacyUrl;
    websiteUrl;
    supportEmail;
}
exports.AppLinksDto = AppLinksDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    (0, class_validator_1.MaxLength)(300),
    __metadata("design:type", String)
], AppLinksDto.prototype, "playStoreUrl", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    (0, class_validator_1.MaxLength)(300),
    __metadata("design:type", String)
], AppLinksDto.prototype, "privacyUrl", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    (0, class_validator_1.MaxLength)(300),
    __metadata("design:type", String)
], AppLinksDto.prototype, "websiteUrl", void 0);
__decorate([
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], AppLinksDto.prototype, "supportEmail", void 0);
class SaveAppConfigDto {
    status;
    features;
    navigation;
    links;
}
exports.SaveAppConfigDto = SaveAppConfigDto;
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => AppStatusDto),
    __metadata("design:type", AppStatusDto)
], SaveAppConfigDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], SaveAppConfigDto.prototype, "features", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], SaveAppConfigDto.prototype, "navigation", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => AppLinksDto),
    __metadata("design:type", AppLinksDto)
], SaveAppConfigDto.prototype, "links", void 0);
//# sourceMappingURL=app-config.dto.js.map