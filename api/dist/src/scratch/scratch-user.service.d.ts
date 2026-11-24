import { PrismaService } from '../prisma/prisma.service';
import { EconomyService } from '../economy/economy.service';
import { RedeemService } from '../redeem/redeem.service';
import { AnalyticsService } from '../analytics/analytics.service';
export declare class ScratchUserService {
    private readonly prisma;
    private readonly economy;
    private readonly redeem;
    private readonly analytics;
    constructor(prisma: PrismaService, economy: EconomyService, redeem: RedeemService, analytics: AnalyticsService);
    userConfig(userId: string): Promise<{
        dayKey: string;
        policy: {
            retentionDays: number;
            autoPurge: boolean;
            showExpired: boolean;
        };
        outcomeOdds: {
            coinsPercent: number;
            redeemPercent: number;
            coinAmount: number;
        };
        giftPool: {
            id: string;
            title: string;
            rewardLabel: string;
            coinReward: number;
            oddsPercent: number;
        }[];
        eligibility: {
            checkinRequired: boolean;
            checkinDone: boolean;
            cardsPerDay: number;
            rollsUsed: number;
            rollsLeft: number;
            canRoll: boolean;
        };
    }>;
    history(userId: string): Promise<{
        retentionDays: number;
        showExpired: boolean;
        items: import("./scratch-history").ScratchHistoryItem[];
    }>;
    userRoll(userId: string): Promise<{
        outcome: "COINS";
        alreadyApplied: boolean;
        coins: number;
        coinDelta: number;
        prizeId: string | null;
        title: string;
        rewardLabel: string;
        redeemCodeId: string | null;
        code: string | null;
    } | {
        outcome: "REDEEM";
        alreadyApplied: boolean;
        coins: number;
        coinDelta: number;
        prizeId: string | null;
        title: string;
        rewardLabel: string;
        redeemCodeId: string;
        code: string;
    }>;
    private assertOdds;
    private finishCoinsRoll;
    private finishRedeemRoll;
    private reserveRollSlot;
    private completeReservedAsCoins;
    private weightedPick;
}
