import { RedeemCadence, RedeemCodeStatus, RedeemType } from '@prisma/client';
export declare function sanitizeRedeemText(raw: string, max: number): string;
export declare function assertRedeemAdminId(raw: string): string;
export declare function assertRedeemType(raw: string): RedeemType;
export declare function assertRedeemStatus(raw: string): RedeemCodeStatus;
export declare function assertRedeemCadence(raw: string): RedeemCadence;
export declare function assertStockLeft(n: number): number;
export declare function assertCodeSecret(raw: string): string;
