import { PrismaService } from '../prisma/prisma.service';
import { RedeemScratchService } from './redeem-scratch.service';
export declare class RedeemCatalogService {
    private readonly prisma;
    private readonly scratchService;
    constructor(prisma: PrismaService, scratchService: RedeemScratchService);
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
}
