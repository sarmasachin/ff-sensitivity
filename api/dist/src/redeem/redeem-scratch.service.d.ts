import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { RedeemScratchPassService } from './redeem-scratch-pass.service';
export declare class RedeemScratchService {
    private readonly prisma;
    private readonly analytics;
    private readonly pass;
    constructor(prisma: PrismaService, analytics: AnalyticsService, pass: RedeemScratchPassService);
    static readonly SAFE_TIP = "Scratch to earn Coins. Limited reward codes distributed via schedule.";
    scratch(userId: string, redeemCodeId: string, attemptKeyRaw: string): Promise<{
        id: string;
        mode: "SCRATCH_REWARD";
        coinsGranted: number;
        code: string | null;
        codeMasked: string | null;
        alreadyProcessed: boolean;
        coinsRemaining: number;
        attemptKey: string;
        tip: string;
    }>;
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
    private toScratchResult;
}
