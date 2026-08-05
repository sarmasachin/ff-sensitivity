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
exports.SavePromosDto = exports.PromoDto = exports.PROMO_PLACEMENTS = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
exports.PROMO_PLACEMENTS = ['HOME_BANNER', 'HOME_STRIP'];
class PromoDto {
    id;
    title;
    subtitle;
    imageLabel;
    deepLink;
    placement;
    sortOrder;
    enabled;
    startsAt;
    endsAt;
}
exports.PromoDto = PromoDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[a-z0-9_]{1,64}$/),
    __metadata("design:type", String)
], PromoDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], PromoDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(160),
    __metadata("design:type", String)
], PromoDto.prototype, "subtitle", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[a-z0-9_-]{1,64}$/i),
    __metadata("design:type", String)
], PromoDto.prototype, "imageLabel", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], PromoDto.prototype, "deepLink", void 0);
__decorate([
    (0, class_validator_1.IsIn)(exports.PROMO_PLACEMENTS),
    __metadata("design:type", Object)
], PromoDto.prototype, "placement", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], PromoDto.prototype, "sortOrder", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], PromoDto.prototype, "enabled", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/),
    __metadata("design:type", String)
], PromoDto.prototype, "startsAt", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/),
    __metadata("design:type", String)
], PromoDto.prototype, "endsAt", void 0);
class SavePromosDto {
    promos;
}
exports.SavePromosDto = SavePromosDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(0),
    (0, class_validator_1.ArrayMaxSize)(40),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => PromoDto),
    __metadata("design:type", Array)
], SavePromosDto.prototype, "promos", void 0);
//# sourceMappingURL=promos.dto.js.map