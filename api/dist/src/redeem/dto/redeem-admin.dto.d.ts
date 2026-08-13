import { RedeemCodeStatus, RedeemMode } from '@prisma/client';
export declare class CreateRedeemTypeDto {
    id: string;
    label: string;
    sortOrder?: number;
    enabled?: boolean;
}
export declare class UpdateRedeemTypeDto {
    label?: string;
    sortOrder?: number;
    enabled?: boolean;
}
export declare class CreateRedeemCadenceDto {
    id: string;
    label: string;
    claimLimit?: number;
    windowHours?: number;
    sortOrder?: number;
    enabled?: boolean;
}
export declare class UpdateRedeemCadenceDto {
    label?: string;
    claimLimit?: number;
    windowHours?: number;
    sortOrder?: number;
    enabled?: boolean;
}
export declare class CreateRedeemCodeDto {
    mode?: RedeemMode;
    title: string;
    type: string;
    valueLabel: string;
    codeSecret?: string;
    codePool?: string[];
    status: RedeemCodeStatus;
    cadence: string;
    stockLeft?: number;
    coinCost?: number | null;
    coinRewardMin?: number;
    coinRewardMax?: number;
    startsAt?: string;
    endsAt?: string;
    windowMinutes?: number;
    codesPerWindow?: number;
    expiresLabel?: string;
    tip?: string;
    redeemUrl?: string;
}
export declare class UpdateRedeemCodeDto {
    title?: string;
    type?: string;
    valueLabel?: string;
    codeSecret?: string;
    codePool?: string[];
    status?: RedeemCodeStatus;
    cadence?: string;
    stockLeft?: number;
    coinCost?: number | null;
    coinRewardMin?: number;
    coinRewardMax?: number;
    startsAt?: string | null;
    endsAt?: string | null;
    windowMinutes?: number;
    codesPerWindow?: number;
    expiresLabel?: string;
    tip?: string;
    redeemUrl?: string;
}
export declare class AppendRedeemPoolDto {
    codePool: string[];
}
export declare class RevealRedeemCodeDto {
    currentPassword?: string;
}
