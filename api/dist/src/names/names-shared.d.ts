import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { NameFontDto, NameFrameDto, NamesPolicyDto } from './dto/names.dto';
export declare const CONFIG_ID = 1;
export declare const MAX_AFFIX = 32;
export declare const MAX_FRAMES = 80;
export declare const MAX_FONTS = 20;
export declare function sanitizeAffix(raw: string): string;
export declare function sanitizeId(raw: string, fallback: string): string;
export declare function mapFrame(f: {
    id: string;
    label: string;
    prefix: string;
    suffix: string;
    premium: boolean;
    enabled: boolean;
}): {
    id: string;
    label: string;
    prefix: string;
    suffix: string;
    premium: boolean;
    enabled: boolean;
};
export declare function mapFont(f: {
    id: string;
    label: string;
    sample: string;
    enabled: boolean;
}): {
    id: string;
    label: string;
    sample: string;
    enabled: boolean;
};
export declare function mapPolicy(row: {
    maxNameChars: number;
    maxBatchSize: number;
    allowSpacesInInput: boolean;
    requireStyleWrap: boolean;
    remotePackEnabled: boolean;
    remotePackUrl: string | null;
}): NamesPolicyDto;
export declare function frameWriteData(f: NameFrameDto, sortOrder: number): {
    id: string;
    label: string;
    prefix: string;
    suffix: string;
    premium: boolean;
    enabled: boolean;
    sortOrder: number;
};
export declare function fontWriteData(f: NameFontDto, sortOrder: number): {
    id: string;
    label: string;
    sample: string;
    enabled: boolean;
    sortOrder: number;
};
export declare function assertSafeRemoteUrl(enabled: boolean, urlRaw: string | undefined): string | null;
export declare function assertFrames(frames: NameFrameDto[]): void;
export declare function assertFonts(fonts: NameFontDto[]): void;
export declare function ensureNamesDefaults(prisma: PrismaService): Promise<void>;
export declare function auditNames(prisma: PrismaService, adminId: string, action: string, entity: string, afterJson: Prisma.InputJsonValue): Promise<void>;
export declare function rethrowUnique(err: unknown, code: string, message: string): never;
