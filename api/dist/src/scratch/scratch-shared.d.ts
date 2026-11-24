import { Prisma, ScratchPrizeKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ScratchPrizeDto } from './dto/scratch.dto';
export declare const CONFIG_ID = "default";
export declare const DEFAULT_CONFIG: {
    coinsPercent: number;
    redeemPercent: number;
    coinAmount: number;
    retentionDays: number;
    autoPurge: boolean;
    showExpired: boolean;
};
export declare function ensureScratchDefaults(prisma: PrismaService): Promise<void>;
export declare function mapPrize(p: {
    id: string;
    title: string;
    detail: string;
    kind: ScratchPrizeKind;
    rewardLabel: string;
    coinReward: number;
    oddsPercent: number;
    enabled: boolean;
    streakDays: number | null;
}): {
    id: string;
    title: string;
    detail: string;
    kind: import(".prisma/client").$Enums.ScratchPrizeKind;
    rewardLabel: string;
    coinReward: number;
    oddsPercent: number;
    enabled: boolean;
    streakDays: number | null;
};
export declare function sanitizeId(raw: string, fallback: string): string;
export declare function prizeWriteData(p: ScratchPrizeDto, sortOrder: number): {
    id: string;
    title: string;
    detail: string;
    kind: ScratchPrizeKind;
    rewardLabel: string;
    coinReward: number;
    oddsPercent: number;
    enabled: boolean;
    streakDays: number | null;
    sortOrder: number;
};
export declare function assertOutcomeOdds(odds: {
    coinsPercent: number;
    redeemPercent: number;
    coinAmount: number;
}): void;
export declare function assertPrizes(prizes: ScratchPrizeDto[]): void;
export declare function auditScratch(prisma: PrismaService, adminId: string, action: string, entity: string, afterJson: Prisma.InputJsonValue): Promise<void>;
export declare function rethrowUnique(err: unknown, code: string, message: string): never;
