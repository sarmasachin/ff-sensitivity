import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppError } from '../common/errors/app-error';
import { PrismaService } from '../prisma/prisma.service';
import type { SaveAppConfigDto } from './dto/app-config.dto';
import type { SaveAdsConfigDto } from './dto/ads-config.dto';
import {
  assertAdsConfigForSave,
  DEFAULT_ADS_CONFIG,
  normalizeAdsConfig,
} from './app-config-ads';
import {
  APP_FEATURE_KEYS,
  APP_NAV_KEYS,
  DEFAULT_APP_CONFIG,
  assertSafeHttpsUrl,
  assertSafeText,
  normalizeBoolMap,
  sanitizeText,
} from './app-config-security';

const CONFIG_ID = 1;

type AppConfigRow = {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  forceUpdate: boolean;
  softUpdatePrompt: boolean;
  minVersionCode: number;
  minVersionName: string;
  featuresJson: Prisma.JsonValue;
  navigationJson: Prisma.JsonValue;
  adsJson: Prisma.JsonValue;
  playStoreUrl: string;
  privacyUrl: string;
  websiteUrl: string;
  supportEmail: string;
};

@Injectable()
export class AppConfigService {
  constructor(private readonly prisma: PrismaService) {}

  private toBundle(row: AppConfigRow) {
    return {
      status: {
        maintenanceMode: row.maintenanceMode,
        maintenanceMessage: row.maintenanceMessage,
        forceUpdate: row.forceUpdate,
        softUpdatePrompt: row.softUpdatePrompt,
        minVersionCode: row.minVersionCode,
        minVersionName: row.minVersionName,
      },
      features: normalizeBoolMap(
        row.featuresJson as Record<string, unknown>,
        APP_FEATURE_KEYS,
      ),
      navigation: normalizeBoolMap(
        row.navigationJson as Record<string, unknown>,
        APP_NAV_KEYS,
      ),
      ads: normalizeAdsConfig(row.adsJson),
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
    if (existing) return existing;
    const d = DEFAULT_APP_CONFIG;
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
        adsJson: DEFAULT_ADS_CONFIG,
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

  /** Public live config for Android cold start. */
  async publicLive() {
    const row = await this.ensureDefaults();
    return this.toBundle(row);
  }

  async adminGetAds() {
    const row = await this.ensureDefaults();
    return normalizeAdsConfig(row.adsJson);
  }

  async adminSaveAds(adminId: string, dto: SaveAdsConfigDto) {
    await this.ensureDefaults();
    const ads = assertAdsConfigForSave(dto);
    const row = await this.prisma.appConfig.update({
      where: { id: CONFIG_ID },
      data: { adsJson: ads },
    });
    await this.prisma.auditLog.create({
      data: {
        actorAdminId: adminId,
        action: 'app.ads_save',
        entity: 'app_config',
        afterJson: ads as unknown as Prisma.InputJsonValue,
      },
    });
    return normalizeAdsConfig(row.adsJson);
  }

  async adminSave(adminId: string, dto: SaveAppConfigDto) {
    await this.ensureDefaults();

    const maintenanceMessage = sanitizeText(dto.status.maintenanceMessage ?? '', 400);
    const minVersionName = sanitizeText(dto.status.minVersionName, 32);
    if (dto.status.maintenanceMode && !maintenanceMessage) {
      throw new AppError(
        'APP_BAD_STATUS',
        'Maintenance message is required when mode is on.',
        400,
      );
    }
    if (!minVersionName) {
      throw new AppError('APP_BAD_STATUS', 'Min version name is required.', 400);
    }
    assertSafeText(maintenanceMessage || 'ok', 'Maintenance message');
    assertSafeText(minVersionName, 'Min version name');

    const features = normalizeBoolMap(dto.features, APP_FEATURE_KEYS);
    const navigation = normalizeBoolMap(dto.navigation, APP_NAV_KEYS);

    const playStoreUrl = assertSafeHttpsUrl(dto.links.playStoreUrl, 'Play Store URL');
    const privacyUrl = assertSafeHttpsUrl(dto.links.privacyUrl, 'Privacy URL');
    const websiteUrl = assertSafeHttpsUrl(dto.links.websiteUrl, 'Website URL');
    const supportEmail = sanitizeText(dto.links.supportEmail, 120).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
      throw new AppError('APP_BAD_EMAIL', 'Support email looks invalid.', 400);
    }

    // Intentionally does not write adsJson — Ads desk owns that field.
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
}
