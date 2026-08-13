import type { AuthUser } from '../user-auth/current-user.decorator';
import { RedeemService } from './redeem.service';
import { ScratchRedeemDto } from './dto/redeem-scratch.dto';
export declare class RedeemController {
    private readonly redeem;
    constructor(redeem: RedeemService);
    catalog(user: AuthUser): Promise<{
        types: {
            id: string;
            label: string;
        }[];
        cadences: {
            id: string;
            label: string;
            claimLimit: number;
            windowHours: number;
        }[];
        items: ({
            id: string;
            type: string;
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
            cadence: string;
            unlocked: boolean;
            mode: "SCRATCH_REWARD";
            coinRewardMin: number | null;
            coinRewardMax: number | null;
            startsAt: string | null;
            endsAt: string | null;
            windowMinutes: number;
            codesPerWindow: number;
            poolLeft: number;
            needsAd: boolean;
            canScratch: boolean;
        } | {
            id: string;
            type: string;
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
            cadence: string;
            unlocked: boolean;
            mode: "SINGLE";
            coinRewardMin: number | null;
            coinRewardMax: number | null;
            startsAt: string | null;
            endsAt: string | null;
            windowMinutes: number;
            codesPerWindow: number;
            poolLeft: number | null;
            needsAd: boolean;
            canScratch: boolean;
        })[];
    }>;
    myClaims(user: AuthUser): Promise<{
        id: string;
        redeemCodeId: string;
        title: string;
        valueLabel: string;
        type: string;
        redeemUrl: string;
        codeMasked: string;
        code: string;
        flagged: boolean;
        createdAt: string;
        whenLabel: string;
    }[]>;
    scratch(user: AuthUser, id: string, dto: ScratchRedeemDto): Promise<{
        id: string;
        mode: "SCRATCH_REWARD";
        coinsGranted: number;
        code: string | null;
        codeMasked: string | null;
        alreadyProcessed: boolean;
        coinsRemaining: number;
        attemptKey: string;
        tip: string;
    }>;
    scratchAdUnlock(user: AuthUser, id: string): Promise<{
        ok: boolean;
        alreadyAllowed: boolean;
        allowedAttempts: number;
        usedAttempts: number;
        needsAd: boolean;
    }>;
    claim(user: AuthUser, id: string): Promise<{
        id: string;
        code: string;
        alreadyClaimed: boolean;
        coinCost: number | null;
        coinsRemaining: number;
    }>;
}
