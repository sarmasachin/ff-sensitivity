import { PrismaService } from '../prisma/prisma.service';
import { EconomyService } from '../economy/economy.service';
import { RedeemService } from '../redeem/redeem.service';
import { AnalyticsService } from '../analytics/analytics.service';
import type { SaveScratchDto } from './dto/scratch.dto';
export declare class ScratchService {
    private readonly prisma;
    private readonly economy;
    private readonly redeem;
    private readonly analytics;
    constructor(prisma: PrismaService, economy: EconomyService, redeem: RedeemService, analytics: AnalyticsService);
    ensureDefaults(): Promise<void>;
    adminGetBundle(): Promise<{
        outcomeOdds: {
            coinsPercent: number;
            redeemPercent: number;
            coinAmount: number;
        };
        policy: {
            retentionDays: number;
            autoPurge: boolean;
            showExpired: boolean;
        };
        prizes: {
            id: string;
            title: string;
            detail: string;
            kind: import(".prisma/client").$Enums.ScratchPrizeKind;
            rewardLabel: string;
            coinReward: number;
            oddsPercent: number;
            enabled: boolean;
            streakDays: number | null;
        }[];
    }>;
    adminSave(adminId: string, dto: SaveScratchDto): Promise<{
        outcomeOdds: {
            coinsPercent: number;
            redeemPercent: number;
            coinAmount: number;
        };
        policy: {
            retentionDays: number;
            autoPurge: boolean;
            showExpired: boolean;
        };
        prizes: {
            id: string;
            title: string;
            detail: string;
            kind: import(".prisma/client").$Enums.ScratchPrizeKind;
            rewardLabel: string;
            coinReward: number;
            oddsPercent: number;
            enabled: boolean;
            streakDays: number | null;
        }[];
    }>;
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
    private finishCoinsRoll;
    private finishRedeemRoll;
    private reserveRollSlot;
    private completeReservedAsCoins;
    private weightedPick;
    private mapPrize;
    private sanitizeId;
    private assertOutcomeOdds;
    private assertPrizes;
}
