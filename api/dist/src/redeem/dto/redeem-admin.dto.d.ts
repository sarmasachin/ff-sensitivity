import { RedeemCadence, RedeemCodeStatus, RedeemType } from '@prisma/client';
export declare class CreateRedeemCodeDto {
    title: string;
    type: RedeemType;
    valueLabel: string;
    codeSecret: string;
    status: RedeemCodeStatus;
    cadence: RedeemCadence;
    stockLeft: number;
    coinCost?: number | null;
    expiresLabel?: string;
    tip?: string;
    redeemUrl?: string;
}
export declare class UpdateRedeemCodeDto {
    title?: string;
    type?: RedeemType;
    valueLabel?: string;
    codeSecret?: string;
    status?: RedeemCodeStatus;
    cadence?: RedeemCadence;
    stockLeft?: number;
    coinCost?: number | null;
    expiresLabel?: string;
    tip?: string;
    redeemUrl?: string;
}
export declare class RevealRedeemCodeDto {
    currentPassword?: string;
}
