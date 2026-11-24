export declare class ChallengeEarnDto {
    kind: 'CHECKIN' | 'QUIZ' | 'AD' | 'MILESTONE';
    correct?: boolean;
    milestoneDays?: number;
}
export declare class ShopPurchaseDto {
    itemId: string;
    requestId: string;
}
export declare class PremiumUnlockDto {
    product: 'best_premium' | 'premium_pro_max' | 'one_tap_premium';
    requestId: string;
}
