import { PrismaService } from '../prisma/prisma.service';
import type { SaveScratchDto } from './dto/scratch.dto';
export declare class ScratchService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    ensureDefaults(): Promise<void>;
    adminGetBundle(): Promise<{
        outcomeOdds: {
            coinsPercent: number;
            redeemPercent: number;
            coinAmount: number;
        };
        policy: {
            retentionDays: number;
            autoPurge: boolean;
            showExpired: boolean;
        };
        prizes: {
            id: string;
            title: string;
            detail: string;
            kind: import(".prisma/client").$Enums.ScratchPrizeKind;
            rewardLabel: string;
            coinReward: number;
            oddsPercent: number;
            enabled: boolean;
            streakDays: number | null;
        }[];
    }>;
    adminSave(adminId: string, dto: SaveScratchDto): Promise<{
        outcomeOdds: {
            coinsPercent: number;
            redeemPercent: number;
            coinAmount: number;
        };
        policy: {
            retentionDays: number;
            autoPurge: boolean;
            showExpired: boolean;
        };
        prizes: {
            id: string;
            title: string;
            detail: string;
            kind: import(".prisma/client").$Enums.ScratchPrizeKind;
            rewardLabel: string;
            coinReward: number;
            oddsPercent: number;
            enabled: boolean;
            streakDays: number | null;
        }[];
    }>;
}
