import type { AuthAdmin } from '../auth/current-admin.decorator';
import { ScratchService } from './scratch.service';
import { SaveScratchDto } from './dto/scratch.dto';
export declare class ScratchAdminController {
    private readonly scratch;
    constructor(scratch: ScratchService);
    get(): Promise<{
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
    save(admin: AuthAdmin, dto: SaveScratchDto): Promise<{
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
