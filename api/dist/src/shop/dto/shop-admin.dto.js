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
exports.UpdateShopItemDto = exports.CreateShopItemDto = exports.UpdateShopCategoryDto = exports.CreateShopCategoryDto = void 0;
const class_validator_1 = require("class-validator");
const MSG = {
    catId: 'Category ID must start with a letter and use A-Z, 0-9, underscore only (2-32).',
    catLabel: 'Category label must be 2-40 characters.',
    itemId: 'Item ID must use lowercase letters, numbers, and underscores only (2-64).',
    title: 'Title must be 2-80 characters.',
    subtitle: 'Subtitle must be 2-200 characters.',
    category: 'Category must start with a letter and use A-Z, 0-9, underscore only.',
    price: 'Price must be at least 1 coin.',
    stock: 'Stock limit must be 0 or higher (or empty for unlimited).',
    rewardTag: 'Reward tag is required (max 40 characters).',
    sortOrder: 'Sort order must be between 0 and 9999.',
};
class CreateShopCategoryDto {
    id;
    label;
    sortOrder;
    enabled;
    isBoost;
}
exports.CreateShopCategoryDto = CreateShopCategoryDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: MSG.catId }),
    (0, class_validator_1.MaxLength)(32, { message: MSG.catId }),
    (0, class_validator_1.Matches)(/^[A-Z][A-Z0-9_]*$/, { message: MSG.catId }),
    __metadata("design:type", String)
], CreateShopCategoryDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: MSG.catLabel }),
    (0, class_validator_1.MaxLength)(40, { message: MSG.catLabel }),
    __metadata("design:type", String)
], CreateShopCategoryDto.prototype, "label", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0, { message: MSG.sortOrder }),
    (0, class_validator_1.Max)(9999, { message: MSG.sortOrder }),
    __metadata("design:type", Number)
], CreateShopCategoryDto.prototype, "sortOrder", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateShopCategoryDto.prototype, "enabled", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateShopCategoryDto.prototype, "isBoost", void 0);
class UpdateShopCategoryDto {
    label;
    sortOrder;
    enabled;
    isBoost;
}
exports.UpdateShopCategoryDto = UpdateShopCategoryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: MSG.catLabel }),
    (0, class_validator_1.MaxLength)(40, { message: MSG.catLabel }),
    __metadata("design:type", String)
], UpdateShopCategoryDto.prototype, "label", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0, { message: MSG.sortOrder }),
    (0, class_validator_1.Max)(9999, { message: MSG.sortOrder }),
    __metadata("design:type", Number)
], UpdateShopCategoryDto.prototype, "sortOrder", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateShopCategoryDto.prototype, "enabled", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateShopCategoryDto.prototype, "isBoost", void 0);
class CreateShopItemDto {
    id;
    title;
    subtitle;
    category;
    priceCoins;
    enabled;
    oneTime;
    stockLimit;
    rewardTag;
    sortOrder;
}
exports.CreateShopItemDto = CreateShopItemDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: MSG.itemId }),
    (0, class_validator_1.MaxLength)(64, { message: MSG.itemId }),
    (0, class_validator_1.Matches)(/^[a-z0-9_]+$/, { message: MSG.itemId }),
    __metadata("design:type", String)
], CreateShopItemDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: MSG.title }),
    (0, class_validator_1.MaxLength)(80, { message: MSG.title }),
    __metadata("design:type", String)
], CreateShopItemDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: MSG.subtitle }),
    (0, class_validator_1.MaxLength)(200, { message: MSG.subtitle }),
    __metadata("design:type", String)
], CreateShopItemDto.prototype, "subtitle", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: MSG.category }),
    (0, class_validator_1.MaxLength)(32, { message: MSG.category }),
    (0, class_validator_1.Matches)(/^[A-Z][A-Z0-9_]*$/, { message: MSG.category }),
    __metadata("design:type", String)
], CreateShopItemDto.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1, { message: MSG.price }),
    (0, class_validator_1.Max)(999999, { message: MSG.price }),
    __metadata("design:type", Number)
], CreateShopItemDto.prototype, "priceCoins", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateShopItemDto.prototype, "enabled", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateShopItemDto.prototype, "oneTime", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_, v) => v !== null),
    (0, class_validator_1.IsInt)({ message: MSG.stock }),
    (0, class_validator_1.Min)(0, { message: MSG.stock }),
    (0, class_validator_1.Max)(999999, { message: MSG.stock }),
    __metadata("design:type", Object)
], CreateShopItemDto.prototype, "stockLimit", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: MSG.rewardTag }),
    (0, class_validator_1.MaxLength)(40, { message: MSG.rewardTag }),
    __metadata("design:type", String)
], CreateShopItemDto.prototype, "rewardTag", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0, { message: MSG.sortOrder }),
    (0, class_validator_1.Max)(9999, { message: MSG.sortOrder }),
    __metadata("design:type", Number)
], CreateShopItemDto.prototype, "sortOrder", void 0);
class UpdateShopItemDto {
    title;
    subtitle;
    category;
    priceCoins;
    enabled;
    oneTime;
    stockLimit;
    rewardTag;
    sortOrder;
}
exports.UpdateShopItemDto = UpdateShopItemDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: MSG.title }),
    (0, class_validator_1.MaxLength)(80, { message: MSG.title }),
    __metadata("design:type", String)
], UpdateShopItemDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: MSG.subtitle }),
    (0, class_validator_1.MaxLength)(200, { message: MSG.subtitle }),
    __metadata("design:type", String)
], UpdateShopItemDto.prototype, "subtitle", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: MSG.category }),
    (0, class_validator_1.MaxLength)(32, { message: MSG.category }),
    (0, class_validator_1.Matches)(/^[A-Z][A-Z0-9_]*$/, { message: MSG.category }),
    __metadata("design:type", String)
], UpdateShopItemDto.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1, { message: MSG.price }),
    (0, class_validator_1.Max)(999999, { message: MSG.price }),
    __metadata("design:type", Number)
], UpdateShopItemDto.prototype, "priceCoins", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateShopItemDto.prototype, "enabled", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateShopItemDto.prototype, "oneTime", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_, v) => v !== null),
    (0, class_validator_1.IsInt)({ message: MSG.stock }),
    (0, class_validator_1.Min)(0, { message: MSG.stock }),
    (0, class_validator_1.Max)(999999, { message: MSG.stock }),
    __metadata("design:type", Object)
], UpdateShopItemDto.prototype, "stockLimit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: MSG.rewardTag }),
    (0, class_validator_1.MaxLength)(40, { message: MSG.rewardTag }),
    __metadata("design:type", String)
], UpdateShopItemDto.prototype, "rewardTag", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0, { message: MSG.sortOrder }),
    (0, class_validator_1.Max)(9999, { message: MSG.sortOrder }),
    __metadata("design:type", Number)
], UpdateShopItemDto.prototype, "sortOrder", void 0);
//# sourceMappingURL=shop-admin.dto.js.map