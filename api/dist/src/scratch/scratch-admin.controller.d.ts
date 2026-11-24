import type { AuthAdmin } from '../auth/current-admin.decorator';
import { ScratchService } from './scratch.service';
import { ScratchAdminPrizesService } from './scratch-admin-prizes.service';
import { SaveScratchDto, ScratchPrizeDto } from './dto/scratch.dto';
export declare class ScratchAdminController {
    private readonly scratch;
    private readonly prizes;
    constructor(scratch: ScratchService, prizes: ScratchAdminPrizesService);
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
    createPrize(admin: AuthAdmin, dto: ScratchPrizeDto): Promise<{
        id: string;
        title: string;
        detail: string;
        kind: import(".prisma/client").$Enums.ScratchPrizeKind;
        rewardLabel: string;
        coinReward: number;
        oddsPercent: number;
        enabled: boolean;
        streakDays: number | null;
    }>;
    updatePrize(admin: AuthAdmin, id: string, dto: ScratchPrizeDto): Promise<{
        id: string;
        title: string;
        detail: string;
        kind: import(".prisma/client").$Enums.ScratchPrizeKind;
        rewardLabel: string;
        coinReward: number;
        oddsPercent: number;
        enabled: boolean;
        streakDays: number | null;
    }>;
    deletePrize(admin: AuthAdmin, id: string): Promise<{
        ok: true;
        id: string;
    }>;
}
