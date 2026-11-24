import { Prisma } from '@prisma/client';
type RateDb = {
    challengeConfig: {
        findUnique: Prisma.TransactionClient['challengeConfig']['findUnique'];
    };
    walletLedger: Prisma.TransactionClient['walletLedger'];
};
export type EconomyRates = {
    checkinCoins: number;
    checkinBoostExtra: number;
    quizCorrectCoins: number;
    quizWrongCoins: number;
    adBonusCoins: number;
    walletCap: number;
    dailyEarnCap: number;
    checkInEnabled: boolean;
    quizEnabled: boolean;
    adBonusEnabled: boolean;
    adBonusCooldownHours: number;
    adBonusCooldownMinutes: number;
};
export declare function loadEconomyRates(db: RateDb): Promise<EconomyRates>;
export declare function settleCoinDelta(tx: Prisma.TransactionClient, userId: string, current: number, delta: number): Promise<{
    nextCoins: number;
    applied: number;
}>;
export {};
