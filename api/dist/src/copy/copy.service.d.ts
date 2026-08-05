import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { SaveCopyConfigDto } from './dto/copy.dto';
export declare class CopyService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private asObject;
    private toBundle;
    ensureDefaults(): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        rateJson: Prisma.JsonValue;
        shareJson: Prisma.JsonValue;
        aboutJson: Prisma.JsonValue;
        legalJson: Prisma.JsonValue;
    }>;
    adminGet(): Promise<{
        rate: {
            enabled: boolean;
            title: string;
            body: string;
            primaryCta: string;
            secondaryCta: string;
            minSessions: number;
        };
        share: {
            sheetTitle: string;
            bodyTemplate: string;
            footerLine: string;
            hashtags: string;
        };
        about: {
            headline: string;
            blurb: string;
            versionPrefix: string;
            websiteCta: string;
            privacyCta: string;
        };
        legal: {
            privacyLabel: string;
            termsLabel: string;
            supportLabel: string;
            storeLabel: string;
        };
    }>;
    publicLive(): Promise<{
        rate: {
            enabled: boolean;
            title: string;
            body: string;
            primaryCta: string;
            secondaryCta: string;
            minSessions: number;
        };
        share: {
            sheetTitle: string;
            bodyTemplate: string;
            footerLine: string;
            hashtags: string;
        };
        about: {
            headline: string;
            blurb: string;
            versionPrefix: string;
            websiteCta: string;
            privacyCta: string;
        };
        legal: {
            privacyLabel: string;
            termsLabel: string;
            supportLabel: string;
            storeLabel: string;
        };
    }>;
    private normalizePayload;
    adminSave(adminId: string, dto: SaveCopyConfigDto): Promise<{
        rate: {
            enabled: boolean;
            title: string;
            body: string;
            primaryCta: string;
            secondaryCta: string;
            minSessions: number;
        };
        share: {
            sheetTitle: string;
            bodyTemplate: string;
            footerLine: string;
            hashtags: string;
        };
        about: {
            headline: string;
            blurb: string;
            versionPrefix: string;
            websiteCta: string;
            privacyCta: string;
        };
        legal: {
            privacyLabel: string;
            termsLabel: string;
            supportLabel: string;
            storeLabel: string;
        };
    }>;
}
