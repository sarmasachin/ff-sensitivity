import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { RedeemScratchService } from './redeem-scratch.service';
import { RedeemClaimsService } from './redeem-claims.service';
import { RedeemCatalogService } from './redeem-catalog.service';
export declare class RedeemService {
    private readonly prisma;
    private readonly analytics;
    private readonly scratchService;
    private readonly claimsService;
    private readonly catalogService;
    constructor(prisma: PrismaService, analytics: AnalyticsService, scratchService: RedeemScratchService, claimsService: RedeemClaimsService, catalogService: RedeemCatalogService);
    catalog(userId: string): Promise<{
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
    claim(userId: string, redeemCodeId: string): Promise<{
        id: string;
        code: string;
        alreadyClaimed: boolean;
        coinCost: number | null;
        coinsRemaining: number;
    }>;
    scratch(userId: string, redeemCodeId: string, attemptKey: string): Promise<{
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
    scratchAdUnlock(userId: string, redeemCodeId: string): Promise<{
        ok: boolean;
        alreadyAllowed: boolean;
        allowedAttempts: number;
        usedAttempts: number;
        needsAd: boolean;
    }>;
    myClaims(userId: string): Promise<{
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
    private assertRedeemId;
    private assertCadenceWindow;
}
