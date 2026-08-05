import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma/prisma.service';
import type { SaveCopyConfigDto } from './dto/copy.dto';
import {
  DEFAULT_COPY_CONFIG,
  assertAllowedPlaceholders,
  assertSafeCopyText,
  assertSafeFooterLine,
  normalizePlaceholders,
  sanitizeCopyMultiline,
  sanitizeCopyText,
} from './copy-security';

// --- Start: Copy CMS live wire (Sachin) ---
const CONFIG_ID = 1;

type CopyBundle = typeof DEFAULT_COPY_CONFIG;

@Injectable()
export class CopyService {
  constructor(private readonly prisma: PrismaService) {}

  private asObject(raw: Prisma.JsonValue): Record<string, unknown> {
    return raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  }

  private toBundle(row: {
    rateJson: Prisma.JsonValue;
    shareJson: Prisma.JsonValue;
    aboutJson: Prisma.JsonValue;
    legalJson: Prisma.JsonValue;
  }): CopyBundle {
    const d = DEFAULT_COPY_CONFIG;
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
        minSessions:
          typeof rate.minSessions === 'number' && rate.minSessions >= 1
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
    if (existing) return existing;
    const d = DEFAULT_COPY_CONFIG;
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

  private normalizePayload(dto: SaveCopyConfigDto): CopyBundle {
    const rateTitle = sanitizeCopyText(dto.rate.title, 120);
    const rateBody = sanitizeCopyMultiline(dto.rate.body, 400);
    const primaryCta = sanitizeCopyText(dto.rate.primaryCta, 60);
    const secondaryCta = sanitizeCopyText(dto.rate.secondaryCta, 60);
    if (!rateTitle || !rateBody || !primaryCta || !secondaryCta) {
      throw new AppError('COPY_BAD_RATE', 'Rate prompt fields are required.', 400);
    }
    assertSafeCopyText(rateTitle, 'Rate title');
    assertSafeCopyText(rateBody, 'Rate body');
    assertSafeCopyText(primaryCta, 'Primary CTA');
    assertSafeCopyText(secondaryCta, 'Secondary CTA');
    const minSessions = Math.floor(Number(dto.rate.minSessions));
    if (!Number.isFinite(minSessions) || minSessions < 1 || minSessions > 100) {
      throw new AppError('COPY_BAD_RATE', 'Min sessions must be 1–100.', 400);
    }

    const sheetTitle = sanitizeCopyText(dto.share.sheetTitle, 80);
    let bodyTemplate = sanitizeCopyMultiline(dto.share.bodyTemplate, 800);
    const hashtags = sanitizeCopyText(dto.share.hashtags ?? '', 120);
    if (!sheetTitle || !bodyTemplate) {
      throw new AppError('COPY_BAD_SHARE', 'Share fields are required.', 400);
    }
    bodyTemplate = normalizePlaceholders(bodyTemplate);
    if (!bodyTemplate.includes('{{settings}}')) {
      throw new AppError(
        'COPY_BAD_SHARE',
        'Share body must include {{settings}} placeholder.',
        400,
      );
    }
    assertSafeCopyText(sheetTitle, 'Share title');
    assertSafeCopyText(bodyTemplate, 'Share body');
    if (hashtags) assertSafeCopyText(hashtags, 'Hashtags');
    assertAllowedPlaceholders(bodyTemplate);
    const footerLine = assertSafeFooterLine(dto.share.footerLine);

    const headline = sanitizeCopyText(dto.about.headline, 80);
    const blurb = sanitizeCopyMultiline(dto.about.blurb, 600);
    const versionPrefix = sanitizeCopyText(dto.about.versionPrefix, 40);
    const websiteCta = sanitizeCopyText(dto.about.websiteCta, 60);
    const privacyCta = sanitizeCopyText(dto.about.privacyCta, 60);
    if (!headline || !blurb || !versionPrefix || !websiteCta || !privacyCta) {
      throw new AppError('COPY_BAD_ABOUT', 'About fields are required.', 400);
    }
    assertSafeCopyText(headline, 'About headline');
    assertSafeCopyText(blurb, 'About blurb');
    assertSafeCopyText(versionPrefix, 'Version prefix');
    assertSafeCopyText(websiteCta, 'Website CTA');
    assertSafeCopyText(privacyCta, 'Privacy CTA');

    const privacyLabel = sanitizeCopyText(dto.legal.privacyLabel, 60);
    const termsLabel = sanitizeCopyText(dto.legal.termsLabel, 60);
    const supportLabel = sanitizeCopyText(dto.legal.supportLabel, 60);
    const storeLabel = sanitizeCopyText(dto.legal.storeLabel, 60);
    if (!privacyLabel || !termsLabel || !supportLabel || !storeLabel) {
      throw new AppError('COPY_BAD_LEGAL', 'Legal labels are required.', 400);
    }
    assertSafeCopyText(privacyLabel, 'Privacy label');
    assertSafeCopyText(termsLabel, 'Terms label');
    assertSafeCopyText(supportLabel, 'Support label');
    assertSafeCopyText(storeLabel, 'Store label');

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

  async adminSave(adminId: string, dto: SaveCopyConfigDto) {
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
}
// --- End: Copy CMS live wire (Sachin) ---
