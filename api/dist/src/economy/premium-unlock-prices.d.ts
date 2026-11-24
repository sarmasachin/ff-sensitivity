import { Prisma } from '@prisma/client';
export type PremiumUnlockProduct = 'best_premium' | 'premium_pro_max' | 'one_tap_premium';
export declare const PREMIUM_UNLOCK_DEFAULT_COINS: Record<PremiumUnlockProduct, number>;
export declare const PREMIUM_UNLOCK_LABEL: Record<PremiumUnlockProduct, string>;
export declare const PREMIUM_UNLOCK_COINS: Record<PremiumUnlockProduct, number>;
export type PremiumUnlockPrices = Record<PremiumUnlockProduct, number>;
export type PremiumUnlockOptions = {
    coinUnlockEnabled: boolean;
    adUnlockEnabled: boolean;
};
export declare const PREMIUM_UNLOCK_DEFAULT_OPTIONS: PremiumUnlockOptions;
type PriceDb = {
    challengeConfig: {
        findUnique: Prisma.TransactionClient['challengeConfig']['findUnique'];
    };
};
export declare function isPremiumUnlockProduct(raw: string): raw is PremiumUnlockProduct;
export declare function clampPremiumUnlockCoins(n: number): number;
export declare function loadPremiumUnlockPrices(db: PriceDb): Promise<PremiumUnlockPrices>;
export declare function loadPremiumUnlockOptions(db: PriceDb): Promise<PremiumUnlockOptions>;
export declare function premiumUnlockCost(prices: PremiumUnlockPrices, product: PremiumUnlockProduct): number;
export {};
