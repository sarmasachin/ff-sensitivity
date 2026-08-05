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
exports.CopyService = void 0;
const common_1 = require("@nestjs/common");
const app_error_1 = require("../common/errors/app-error");
const prisma_service_1 = require("../prisma/prisma.service");
const copy_security_1 = require("./copy-security");
const CONFIG_ID = 1;
let CopyService = class CopyService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    asObject(raw) {
        return raw && typeof raw === 'object' && !Array.isArray(raw)
            ? raw
            : {};
    }
    toBundle(row) {
        const d = copy_security_1.DEFAULT_COPY_CONFIG;
        const rate = this.asObject(row.rateJson);
        const share = this.asObject(row.shareJson);
        const about = this.asObject(row.aboutJson);
        const legal = this.asObject(row.legalJson);
        return {
            rate: {
                enabled: typeof rate.enabled === 'boolean' ? rate.enabled : d.rate.enabled,
                title: String(rate.title ?? d.rate.title),
                body: String(rate.body ?? d.rate.body),
                primaryCta: String(rate.primaryCta ?? d.rate.primaryCta),
                secondaryCta: String(rate.secondaryCta ?? d.rate.secondaryCta),
                minSessions: typeof rate.minSessions === 'number' && rate.minSessions >= 1
                    ? Math.min(100, Math.floor(rate.minSessions))
                    : d.rate.minSessions,
            },
            share: {
                sheetTitle: String(share.sheetTitle ?? d.share.sheetTitle),
                bodyTemplate: String(share.bodyTemplate ?? d.share.bodyTemplate),
                footerLine: String(share.footerLine ?? d.share.footerLine),
                hashtags: String(share.hashtags ?? d.share.hashtags),
            },
            about: {
                headline: String(about.headline ?? d.about.headline),
                blurb: String(about.blurb ?? d.about.blurb),
                versionPrefix: String(about.versionPrefix ?? d.about.versionPrefix),
                websiteCta: String(about.websiteCta ?? d.about.websiteCta),
                privacyCta: String(about.privacyCta ?? d.about.privacyCta),
            },
            legal: {
                privacyLabel: String(legal.privacyLabel ?? d.legal.privacyLabel),
                termsLabel: String(legal.termsLabel ?? d.legal.termsLabel),
                supportLabel: String(legal.supportLabel ?? d.legal.supportLabel),
                storeLabel: String(legal.storeLabel ?? d.legal.storeLabel),
            },
        };
    }
    async ensureDefaults() {
        const existing = await this.prisma.copyConfig.findUnique({
            where: { id: CONFIG_ID },
        });
        if (existing)
            return existing;
        const d = copy_security_1.DEFAULT_COPY_CONFIG;
        return this.prisma.copyConfig.create({
            data: {
                id: CONFIG_ID,
                rateJson: d.rate,
                shareJson: d.share,
                aboutJson: d.about,
                legalJson: d.legal,
            },
        });
    }
    async adminGet() {
        return this.toBundle(await this.ensureDefaults());
    }
    async publicLive() {
        return this.toBundle(await this.ensureDefaults());
    }
    normalizePayload(dto) {
        const rateTitle = (0, copy_security_1.sanitizeCopyText)(dto.rate.title, 120);
        const rateBody = (0, copy_security_1.sanitizeCopyMultiline)(dto.rate.body, 400);
        const primaryCta = (0, copy_security_1.sanitizeCopyText)(dto.rate.primaryCta, 60);
        const secondaryCta = (0, copy_security_1.sanitizeCopyText)(dto.rate.secondaryCta, 60);
        if (!rateTitle || !rateBody || !primaryCta || !secondaryCta) {
            throw new app_error_1.AppError('COPY_BAD_RATE', 'Rate prompt fields are required.', 400);
        }
        (0, copy_security_1.assertSafeCopyText)(rateTitle, 'Rate title');
        (0, copy_security_1.assertSafeCopyText)(rateBody, 'Rate body');
        (0, copy_security_1.assertSafeCopyText)(primaryCta, 'Primary CTA');
        (0, copy_security_1.assertSafeCopyText)(secondaryCta, 'Secondary CTA');
        const minSessions = Math.floor(Number(dto.rate.minSessions));
        if (!Number.isFinite(minSessions) || minSessions < 1 || minSessions > 100) {
            throw new app_error_1.AppError('COPY_BAD_RATE', 'Min sessions must be 1–100.', 400);
        }
        const sheetTitle = (0, copy_security_1.sanitizeCopyText)(dto.share.sheetTitle, 80);
        let bodyTemplate = (0, copy_security_1.sanitizeCopyMultiline)(dto.share.bodyTemplate, 800);
        const hashtags = (0, copy_security_1.sanitizeCopyText)(dto.share.hashtags ?? '', 120);
        if (!sheetTitle || !bodyTemplate) {
            throw new app_error_1.AppError('COPY_BAD_SHARE', 'Share fields are required.', 400);
        }
        bodyTemplate = (0, copy_security_1.normalizePlaceholders)(bodyTemplate);
        if (!bodyTemplate.includes('{{settings}}')) {
            throw new app_error_1.AppError('COPY_BAD_SHARE', 'Share body must include {{settings}} placeholder.', 400);
        }
        (0, copy_security_1.assertSafeCopyText)(sheetTitle, 'Share title');
        (0, copy_security_1.assertSafeCopyText)(bodyTemplate, 'Share body');
        if (hashtags)
            (0, copy_security_1.assertSafeCopyText)(hashtags, 'Hashtags');
        (0, copy_security_1.assertAllowedPlaceholders)(bodyTemplate);
        const footerLine = (0, copy_security_1.assertSafeFooterLine)(dto.share.footerLine);
        const headline = (0, copy_security_1.sanitizeCopyText)(dto.about.headline, 80);
        const blurb = (0, copy_security_1.sanitizeCopyMultiline)(dto.about.blurb, 600);
        const versionPrefix = (0, copy_security_1.sanitizeCopyText)(dto.about.versionPrefix, 40);
        const websiteCta = (0, copy_security_1.sanitizeCopyText)(dto.about.websiteCta, 60);
        const privacyCta = (0, copy_security_1.sanitizeCopyText)(dto.about.privacyCta, 60);
        if (!headline || !blurb || !versionPrefix || !websiteCta || !privacyCta) {
            throw new app_error_1.AppError('COPY_BAD_ABOUT', 'About fields are required.', 400);
        }
        (0, copy_security_1.assertSafeCopyText)(headline, 'About headline');
        (0, copy_security_1.assertSafeCopyText)(blurb, 'About blurb');
        (0, copy_security_1.assertSafeCopyText)(versionPrefix, 'Version prefix');
        (0, copy_security_1.assertSafeCopyText)(websiteCta, 'Website CTA');
        (0, copy_security_1.assertSafeCopyText)(privacyCta, 'Privacy CTA');
        const privacyLabel = (0, copy_security_1.sanitizeCopyText)(dto.legal.privacyLabel, 60);
        const termsLabel = (0, copy_security_1.sanitizeCopyText)(dto.legal.termsLabel, 60);
        const supportLabel = (0, copy_security_1.sanitizeCopyText)(dto.legal.supportLabel, 60);
        const storeLabel = (0, copy_security_1.sanitizeCopyText)(dto.legal.storeLabel, 60);
        if (!privacyLabel || !termsLabel || !supportLabel || !storeLabel) {
            throw new app_error_1.AppError('COPY_BAD_LEGAL', 'Legal labels are required.', 400);
        }
        (0, copy_security_1.assertSafeCopyText)(privacyLabel, 'Privacy label');
        (0, copy_security_1.assertSafeCopyText)(termsLabel, 'Terms label');
        (0, copy_security_1.assertSafeCopyText)(supportLabel, 'Support label');
        (0, copy_security_1.assertSafeCopyText)(storeLabel, 'Store label');
        return {
            rate: {
                enabled: Boolean(dto.rate.enabled),
                title: rateTitle,
                body: rateBody,
                primaryCta,
                secondaryCta,
                minSessions,
            },
            share: { sheetTitle, bodyTemplate, footerLine, hashtags },
            about: { headline, blurb, versionPrefix, websiteCta, privacyCta },
            legal: { privacyLabel, termsLabel, supportLabel, storeLabel },
        };
    }
    async adminSave(adminId, dto) {
        await this.ensureDefaults();
        const bundle = this.normalizePayload(dto);
        const row = await this.prisma.copyConfig.update({
            where: { id: CONFIG_ID },
            data: {
                rateJson: bundle.rate,
                shareJson: bundle.share,
                aboutJson: bundle.about,
                legalJson: bundle.legal,
            },
        });
        await this.prisma.auditLog.create({
            data: {
                actorAdminId: adminId,
                action: 'copy.config_save',
                entity: 'copy_config',
                afterJson: {
                    rateEnabled: bundle.rate.enabled,
                    minSessions: bundle.rate.minSessions,
                    shareTitle: bundle.share.sheetTitle,
                },
            },
        });
        return this.toBundle(row);
    }
};
exports.CopyService = CopyService;
exports.CopyService = CopyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CopyService);
//# sourceMappingURL=copy.service.js.map