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
exports.SaveCopyConfigDto = exports.CopyLegalDto = exports.CopyAboutDto = exports.CopyShareDto = exports.CopyRateDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class CopyRateDto {
    enabled;
    title;
    body;
    primaryCta;
    secondaryCta;
    minSessions;
}
exports.CopyRateDto = CopyRateDto;
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CopyRateDto.prototype, "enabled", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], CopyRateDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(400),
    __metadata("design:type", String)
], CopyRateDto.prototype, "body", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(60),
    __metadata("design:type", String)
], CopyRateDto.prototype, "primaryCta", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(60),
    __metadata("design:type", String)
], CopyRateDto.prototype, "secondaryCta", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CopyRateDto.prototype, "minSessions", void 0);
class CopyShareDto {
    sheetTitle;
    bodyTemplate;
    footerLine;
    hashtags;
}
exports.CopyShareDto = CopyShareDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], CopyShareDto.prototype, "sheetTitle", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(800),
    __metadata("design:type", String)
], CopyShareDto.prototype, "bodyTemplate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(300),
    __metadata("design:type", String)
], CopyShareDto.prototype, "footerLine", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], CopyShareDto.prototype, "hashtags", void 0);
class CopyAboutDto {
    headline;
    blurb;
    versionPrefix;
    websiteCta;
    privacyCta;
}
exports.CopyAboutDto = CopyAboutDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], CopyAboutDto.prototype, "headline", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(600),
    __metadata("design:type", String)
], CopyAboutDto.prototype, "blurb", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(40),
    __metadata("design:type", String)
], CopyAboutDto.prototype, "versionPrefix", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(60),
    __metadata("design:type", String)
], CopyAboutDto.prototype, "websiteCta", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(60),
    __metadata("design:type", String)
], CopyAboutDto.prototype, "privacyCta", void 0);
class CopyLegalDto {
    privacyLabel;
    termsLabel;
    supportLabel;
    storeLabel;
}
exports.CopyLegalDto = CopyLegalDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(60),
    __metadata("design:type", String)
], CopyLegalDto.prototype, "privacyLabel", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(60),
    __metadata("design:type", String)
], CopyLegalDto.prototype, "termsLabel", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(60),
    __metadata("design:type", String)
], CopyLegalDto.prototype, "supportLabel", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(60),
    __metadata("design:type", String)
], CopyLegalDto.prototype, "storeLabel", void 0);
class SaveCopyConfigDto {
    rate;
    share;
    about;
    legal;
}
exports.SaveCopyConfigDto = SaveCopyConfigDto;
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => CopyRateDto),
    __metadata("design:type", CopyRateDto)
], SaveCopyConfigDto.prototype, "rate", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => CopyShareDto),
    __metadata("design:type", CopyShareDto)
], SaveCopyConfigDto.prototype, "share", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => CopyAboutDto),
    __metadata("design:type", CopyAboutDto)
], SaveCopyConfigDto.prototype, "about", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => CopyLegalDto),
    __metadata("design:type", CopyLegalDto)
], SaveCopyConfigDto.prototype, "legal", void 0);
//# sourceMappingURL=copy.dto.js.map