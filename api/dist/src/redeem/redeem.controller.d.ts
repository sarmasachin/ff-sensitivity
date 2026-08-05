import type { AuthUser } from '../user-auth/current-user.decorator';
import { RedeemService } from './redeem.service';
export declare class RedeemController {
    private readonly redeem;
    constructor(redeem: RedeemService);
    catalog(user: AuthUser): Promise<{
        items: {
            id: string;
            type: import(".prisma/client").$Enums.RedeemType;
            title: string;
            valueLabel: string;
            codeMasked: string;
            code: string | null | undefined;
            status: string;
            expiresLabel: string;
            tip: string;
            redeemUrl: string;
            stockLeft: number;
            coinCost: number | null;
            cadence: import(".prisma/client").$Enums.RedeemCadence;
            unlocked: boolean;
        }[];
    }>;
    myClaims(user: AuthUser): Promise<{
        id: string;
        redeemCodeId: string;
        title: string;
        valueLabel: string;
        type: import(".prisma/client").$Enums.RedeemType;
        redeemUrl: string;
        codeMasked: string;
        code: string;
        flagged: boolean;
        createdAt: string;
        whenLabel: string;
    }[]>;
    claim(user: AuthUser, id: string): Promise<{
        id: string;
        code: string;
        alreadyClaimed: boolean;
        coinCost: number | null;
        coinsRemaining: number;
    }>;
}
