export declare class ScratchOutcomeOddsDto {
    coinsPercent: number;
    redeemPercent: number;
    coinAmount: number;
}
export declare class ScratchPolicyDto {
    retentionDays: number;
    autoPurge: boolean;
    showExpired: boolean;
}
export declare class ScratchPrizeDto {
    id: string;
    title: string;
    detail: string;
    kind: 'MILESTONE' | 'REDEEM' | 'SHOP' | 'GIFT';
    rewardLabel: string;
    coinReward: number;
    oddsPercent: number;
    enabled: boolean;
    streakDays?: number | null;
}
export declare class SaveScratchDto {
    outcomeOdds: ScratchOutcomeOddsDto;
    policy: ScratchPolicyDto;
    prizes: ScratchPrizeDto[];
}
