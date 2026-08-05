export declare class WalletAdjustDto {
    amount: number;
    reason: string;
    requestId: string;
    currentPassword?: string;
}
export declare class WalletFreezeDto {
    action: 'freeze' | 'unfreeze';
}
