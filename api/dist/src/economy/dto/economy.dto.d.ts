export declare class ChallengeEarnDto {
    kind: 'CHECKIN' | 'QUIZ' | 'AD' | 'MILESTONE';
    correct?: boolean;
    milestoneDays?: number;
}
export declare class ShopPurchaseDto {
    itemId: string;
    requestId: string;
}
