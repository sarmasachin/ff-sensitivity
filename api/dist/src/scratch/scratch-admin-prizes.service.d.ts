import { PrismaService } from '../prisma/prisma.service';
import type { ScratchPrizeDto } from './dto/scratch.dto';
export declare class ScratchAdminPrizesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(adminId: string, dto: ScratchPrizeDto): Promise<{
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
    update(adminId: string, rawId: string, dto: ScratchPrizeDto): Promise<{
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
    delete(adminId: string, rawId: string): Promise<{
        ok: true;
        id: string;
    }>;
}
