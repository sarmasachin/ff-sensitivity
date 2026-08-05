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
exports.SaveOpsSettingsDto = exports.SecurityDto = exports.SessionDto = exports.PreferencesDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class PreferencesDto {
    defaultLanding;
    compactTables;
    showInlineNotices;
    denseSidebar;
    timezoneLabel;
}
exports.PreferencesDto = PreferencesDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(64),
    __metadata("design:type", String)
], PreferencesDto.prototype, "defaultLanding", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], PreferencesDto.prototype, "compactTables", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], PreferencesDto.prototype, "showInlineNotices", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], PreferencesDto.prototype, "denseSidebar", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(64),
    __metadata("design:type", String)
], PreferencesDto.prototype, "timezoneLabel", void 0);
class SessionDto {
    idleTimeoutMinutes;
    absoluteSessionHours;
    rememberDeviceDays;
    logoutOnBrowserClose;
    singleSessionOnly;
}
exports.SessionDto = SessionDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SessionDto.prototype, "idleTimeoutMinutes", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SessionDto.prototype, "absoluteSessionHours", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SessionDto.prototype, "rememberDeviceDays", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SessionDto.prototype, "logoutOnBrowserClose", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SessionDto.prototype, "singleSessionOnly", void 0);
class SecurityDto {
    requireReauthForReveal;
    requireReauthForStaffInvite;
    requireReauthForWalletAdjust;
    allowViewerCsvExport;
    ipAllowlistNote;
    auditRetentionDays;
    auditAutoPurge;
    lastAuditPurgeAt;
}
exports.SecurityDto = SecurityDto;
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SecurityDto.prototype, "requireReauthForReveal", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SecurityDto.prototype, "requireReauthForStaffInvite", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SecurityDto.prototype, "requireReauthForWalletAdjust", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SecurityDto.prototype, "allowViewerCsvExport", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], SecurityDto.prototype, "ipAllowlistNote", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(7),
    (0, class_validator_1.Max)(3650),
    __metadata("design:type", Number)
], SecurityDto.prototype, "auditRetentionDays", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SecurityDto.prototype, "auditAutoPurge", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(40),
    __metadata("design:type", Object)
], SecurityDto.prototype, "lastAuditPurgeAt", void 0);
class SaveOpsSettingsDto {
    preferences;
    session;
    security;
}
exports.SaveOpsSettingsDto = SaveOpsSettingsDto;
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => PreferencesDto),
    __metadata("design:type", PreferencesDto)
], SaveOpsSettingsDto.prototype, "preferences", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => SessionDto),
    __metadata("design:type", SessionDto)
], SaveOpsSettingsDto.prototype, "session", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => SecurityDto),
    __metadata("design:type", SecurityDto)
], SaveOpsSettingsDto.prototype, "security", void 0);
//# sourceMappingURL=settings.dto.js.map