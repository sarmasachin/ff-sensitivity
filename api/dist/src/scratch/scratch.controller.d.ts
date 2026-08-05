import type { AuthUser } from '../user-auth/current-user.decorator';
import { ScratchService } from './scratch.service';
export declare class ScratchController {
    private readonly scratch;
    constructor(scratch: ScratchService);
    config(user: AuthUser): Promise<{
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
    roll(user: AuthUser): Promise<{
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
}
