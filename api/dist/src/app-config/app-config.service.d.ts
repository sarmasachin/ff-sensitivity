import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { SaveAppConfigDto } from './dto/app-config.dto';
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
        links: {
            playStoreUrl: string;
            privacyUrl: string;
            websiteUrl: string;
            supportEmail: string;
        };
    }>;
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
        links: {
            playStoreUrl: string;
            privacyUrl: string;
            websiteUrl: string;
            supportEmail: string;
        };
    }>;
}
