export declare class EconomyEarnDto {
    checkInCoins: number;
    quizCorrectCoins: number;
    quizWrongCoins: number;
    adBonusCoins: number;
}
export declare class EconomyLimitsDto {
    walletCap: number;
    dailyEarnCap: number;
}
export declare class EconomyPremiumUnlockDto {
    bestPremium: number;
    premiumProMax: number;
    oneTapPremium: number;
    coinUnlockEnabled: boolean;
    adUnlockEnabled: boolean;
}
export declare class SaveEconomyDto {
    earn: EconomyEarnDto;
    limits: EconomyLimitsDto;
    premiumUnlock: EconomyPremiumUnlockDto;
    checkInEnabled: boolean;
    quizEnabled: boolean;
    adBonusEnabled: boolean;
}
