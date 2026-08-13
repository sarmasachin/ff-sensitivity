import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
export declare class RedeemScratchService {
    private readonly prisma;
    private readonly analytics;
    constructor(prisma: PrismaService, analytics: AnalyticsService);
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
    }>;
    private assertScratchCardOpen;
    private assertSeat;
    private toScratchResult;
}
