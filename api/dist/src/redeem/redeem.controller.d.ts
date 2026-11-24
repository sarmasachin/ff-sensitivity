import type { AuthUser } from '../user-auth/current-user.decorator';
import { RedeemService } from './redeem.service';
import { RedeemCommentDto } from './dto/redeem-comment.dto';
import { RedeemVoteDto } from './dto/redeem-vote.dto';
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
            yesCount: number;
            noCount: number;
            myVote: boolean | null;
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
            waitUntil: string | null;
            waitNext: string | null;
        } | {
            yesCount: number;
            noCount: number;
            myVote: boolean | null;
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
            waitUntil: null;
            waitNext: null;
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
    winners(cadence?: string): Promise<{
        items: {
            id: string;
            displayName: string;
            prizeLabel: string;
            cadence: string;
            text: string;
            createdAt: string;
        }[];
    }>;
    comments(id: string): Promise<{
        items: {
            id: string;
            name: string;
            text: string;
            createdAt: string;
        }[];
    }>;
    addComment(user: AuthUser, id: string, dto: RedeemCommentDto): Promise<{
        id: string;
        name: string;
        text: string;
        createdAt: string;
    }>;
    vote(user: AuthUser, id: string, dto: RedeemVoteDto): Promise<{
        worked: boolean;
        yesCount: number;
        noCount: number;
    }>;
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
