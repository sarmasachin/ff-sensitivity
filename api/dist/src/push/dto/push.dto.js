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
exports.RegisterPushDeviceDto = exports.UpsertPushCampaignDto = exports.PUSH_SCHEDULE_MODES = exports.PUSH_AUDIENCES = void 0;
const class_validator_1 = require("class-validator");
exports.PUSH_AUDIENCES = ['ALL', 'ACTIVE_7D', 'NO_CLAIM', 'TOPIC'];
exports.PUSH_SCHEDULE_MODES = ['draft', 'later', 'now'];
class UpsertPushCampaignDto {
    id;
    title;
    body;
    deepLink;
    audience;
    topic;
    scheduleMode;
    scheduledAt;
}
exports.UpsertPushCampaignDto = UpsertPushCampaignDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[a-z0-9_]{1,64}$/),
    __metadata("design:type", String)
], UpsertPushCampaignDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(65),
    __metadata("design:type", String)
], UpsertPushCampaignDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(180),
    __metadata("design:type", String)
], UpsertPushCampaignDto.prototype, "body", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], UpsertPushCampaignDto.prototype, "deepLink", void 0);
__decorate([
    (0, class_validator_1.IsIn)(exports.PUSH_AUDIENCES),
    __metadata("design:type", Object)
], UpsertPushCampaignDto.prototype, "audience", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(64),
    __metadata("design:type", String)
], UpsertPushCampaignDto.prototype, "topic", void 0);
__decorate([
    (0, class_validator_1.IsIn)(exports.PUSH_SCHEDULE_MODES),
    __metadata("design:type", Object)
], UpsertPushCampaignDto.prototype, "scheduleMode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/),
    __metadata("design:type", String)
], UpsertPushCampaignDto.prototype, "scheduledAt", void 0);
class RegisterPushDeviceDto {
    token;
    platform;
    topics;
    installId;
}
exports.RegisterPushDeviceDto = RegisterPushDeviceDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    (0, class_validator_1.MaxLength)(512),
    __metadata("design:type", String)
], RegisterPushDeviceDto.prototype, "token", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['android', 'ios']),
    __metadata("design:type", String)
], RegisterPushDeviceDto.prototype, "platform", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(20),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.MaxLength)(64, { each: true }),
    __metadata("design:type", Array)
], RegisterPushDeviceDto.prototype, "topics", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(12),
    (0, class_validator_1.MaxLength)(64),
    __metadata("design:type", String)
], RegisterPushDeviceDto.prototype, "installId", void 0);
//# sourceMappingURL=push.dto.js.map