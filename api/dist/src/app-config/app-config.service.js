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
exports.AppConfigService = void 0;
const common_1 = require("@nestjs/common");
const app_error_1 = require("../common/errors/app-error");
const prisma_service_1 = require("../prisma/prisma.service");
const app_config_security_1 = require("./app-config-security");
const CONFIG_ID = 1;
let AppConfigService = class AppConfigService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    toBundle(row) {
        return {
            status: {
                maintenanceMode: row.maintenanceMode,
                maintenanceMessage: row.maintenanceMessage,
                forceUpdate: row.forceUpdate,
                softUpdatePrompt: row.softUpdatePrompt,
                minVersionCode: row.minVersionCode,
                minVersionName: row.minVersionName,
            },
            features: (0, app_config_security_1.normalizeBoolMap)(row.featuresJson, app_config_security_1.APP_FEATURE_KEYS),
            navigation: (0, app_config_security_1.normalizeBoolMap)(row.navigationJson, app_config_security_1.APP_NAV_KEYS),
            links: {
                playStoreUrl: row.playStoreUrl,
                privacyUrl: row.privacyUrl,
                websiteUrl: row.websiteUrl,
                supportEmail: row.supportEmail,
            },
        };
    }
    async ensureDefaults() {
        const existing = await this.prisma.appConfig.findUnique({
            where: { id: CONFIG_ID },
        });
        if (existing)
            return existing;
        const d = app_config_security_1.DEFAULT_APP_CONFIG;
        return this.prisma.appConfig.create({
            data: {
                id: CONFIG_ID,
                maintenanceMode: d.status.maintenanceMode,
                maintenanceMessage: d.status.maintenanceMessage,
                forceUpdate: d.status.forceUpdate,
                softUpdatePrompt: d.status.softUpdatePrompt,
                minVersionCode: d.status.minVersionCode,
                minVersionName: d.status.minVersionName,
                featuresJson: d.features,
                navigationJson: d.navigation,
                playStoreUrl: d.links.playStoreUrl,
                privacyUrl: d.links.privacyUrl,
                websiteUrl: d.links.websiteUrl,
                supportEmail: d.links.supportEmail,
            },
        });
    }
    async adminGet() {
        const row = await this.ensureDefaults();
        return this.toBundle(row);
    }
    async publicLive() {
        const row = await this.ensureDefaults();
        return this.toBundle(row);
    }
    async adminSave(adminId, dto) {
        await this.ensureDefaults();
        const maintenanceMessage = (0, app_config_security_1.sanitizeText)(dto.status.maintenanceMessage ?? '', 400);
        const minVersionName = (0, app_config_security_1.sanitizeText)(dto.status.minVersionName, 32);
        if (dto.status.maintenanceMode && !maintenanceMessage) {
            throw new app_error_1.AppError('APP_BAD_STATUS', 'Maintenance message is required when mode is on.', 400);
        }
        if (!minVersionName) {
            throw new app_error_1.AppError('APP_BAD_STATUS', 'Min version name is required.', 400);
        }
        (0, app_config_security_1.assertSafeText)(maintenanceMessage || 'ok', 'Maintenance message');
        (0, app_config_security_1.assertSafeText)(minVersionName, 'Min version name');
        const features = (0, app_config_security_1.normalizeBoolMap)(dto.features, app_config_security_1.APP_FEATURE_KEYS);
        const navigation = (0, app_config_security_1.normalizeBoolMap)(dto.navigation, app_config_security_1.APP_NAV_KEYS);
        const playStoreUrl = (0, app_config_security_1.assertSafeHttpsUrl)(dto.links.playStoreUrl, 'Play Store URL');
        const privacyUrl = (0, app_config_security_1.assertSafeHttpsUrl)(dto.links.privacyUrl, 'Privacy URL');
        const websiteUrl = (0, app_config_security_1.assertSafeHttpsUrl)(dto.links.websiteUrl, 'Website URL');
        const supportEmail = (0, app_config_security_1.sanitizeText)(dto.links.supportEmail, 120).toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
            throw new app_error_1.AppError('APP_BAD_EMAIL', 'Support email looks invalid.', 400);
        }
        const row = await this.prisma.appConfig.update({
            where: { id: CONFIG_ID },
            data: {
                maintenanceMode: Boolean(dto.status.maintenanceMode),
                maintenanceMessage,
                forceUpdate: Boolean(dto.status.forceUpdate),
                softUpdatePrompt: Boolean(dto.status.softUpdatePrompt),
                minVersionCode: dto.status.minVersionCode,
                minVersionName,
                featuresJson: features,
                navigationJson: navigation,
                playStoreUrl,
                privacyUrl,
                websiteUrl,
                supportEmail,
            },
        });
        await this.prisma.auditLog.create({
            data: {
                actorAdminId: adminId,
                action: 'app.config_save',
                entity: 'app_config',
                afterJson: {
                    maintenanceMode: row.maintenanceMode,
                    forceUpdate: row.forceUpdate,
                    minVersionCode: row.minVersionCode,
                },
            },
        });
        return this.toBundle(row);
    }
};
exports.AppConfigService = AppConfigService;
exports.AppConfigService = AppConfigService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AppConfigService);
//# sourceMappingURL=app-config.service.js.map