import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { SaveAppConfigDto } from './dto/app-config.dto';
import type { SaveAdsConfigDto } from './dto/ads-config.dto';
import type { SaveProMaxConfigDto } from './dto/promax-config.dto';
export declare class AppConfigService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private toBundle;
    ensureDefaults(): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        maintenanceMode: boolean;
        maintenanceMessage: string;
        forceUpdate: boolean;
        softUpdatePrompt: boolean;
        minVersionCode: number;
        minVersionName: string;
        featuresJson: Prisma.JsonValue;
        navigationJson: Prisma.JsonValue;
        adsJson: Prisma.JsonValue;
        promaxJson: Prisma.JsonValue;
        playStoreUrl: string;
        privacyUrl: string;
        websiteUrl: string;
        supportEmail: string;
    }>;
    adminGet(): Promise<{
        status: {
            maintenanceMode: boolean;
            maintenanceMessage: string;
            forceUpdate: boolean;
            softUpdatePrompt: boolean;
            minVersionCode: number;
            minVersionName: string;
        };
        features: Record<string, boolean>;
        navigation: Record<string, boolean>;
        ads: import("./app-config-ads").AdsConfigBundle;
        links: {
            playStoreUrl: string;
            privacyUrl: string;
            websiteUrl: string;
            supportEmail: string;
        };
    }>;
    publicLive(): Promise<{
        status: {
            maintenanceMode: boolean;
            maintenanceMessage: string;
            forceUpdate: boolean;
            softUpdatePrompt: boolean;
            minVersionCode: number;
            minVersionName: string;
        };
        features: Record<string, boolean>;
        navigation: Record<string, boolean>;
        ads: import("./app-config-ads").AdsConfigBundle;
        links: {
            playStoreUrl: string;
            privacyUrl: string;
            websiteUrl: string;
            supportEmail: string;
        };
    }>;
    adminGetAds(): Promise<import("./app-config-ads").AdsConfigBundle>;
    adminSaveAds(adminId: string, dto: SaveAdsConfigDto): Promise<import("./app-config-ads").AdsConfigBundle>;
    adminGetProMax(): Promise<import("./app-config-promax").ProMaxConfigBundle>;
    publicProMaxShareConflict(): Promise<import("./app-config-promax").ProMaxShareConflictKnobs>;
    adminSaveProMax(adminId: string, dto: SaveProMaxConfigDto): Promise<import("./app-config-promax").ProMaxConfigBundle>;
    adminSave(adminId: string, dto: SaveAppConfigDto): Promise<{
        status: {
            maintenanceMode: boolean;
            maintenanceMessage: string;
            forceUpdate: boolean;
            softUpdatePrompt: boolean;
            minVersionCode: number;
            minVersionName: string;
        };
        features: Record<string, boolean>;
        navigation: Record<string, boolean>;
        ads: import("./app-config-ads").AdsConfigBundle;
        links: {
            playStoreUrl: string;
            privacyUrl: string;
            websiteUrl: string;
            supportEmail: string;
        };
    }>;
}
