import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
export declare class RedeemScratchPassService {
    private readonly prisma;
    private readonly analytics;
    constructor(prisma: PrismaService, analytics: AnalyticsService);
    adUnlock(userId: string, redeemCodeId: string): Promise<{
        ok: boolean;
        alreadyAllowed: boolean;
        allowedAttempts: number;
        usedAttempts: number;
        needsAd: boolean;
    }>;
    scratchMeta(userId: string, redeemCodeId: string): Promise<{
        usedAttempts: number;
        allowedAttempts: number;
        needsAd: boolean;
        canScratch: boolean;
        waitUntil: string | null;
        waitNext: "AD" | "SCRATCH" | null;
    } | {
        waitUntil: string;
        waitNext: string;
        usedAttempts: number;
        allowedAttempts: number;
        needsAd: boolean;
        canScratch: boolean;
    }>;
}
