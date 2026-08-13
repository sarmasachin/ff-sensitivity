import { PrismaService } from '../prisma/prisma.service';
import { RedeemAdminDefsService } from './redeem-admin-defs.service';
import type { CreateRedeemCodeDto } from './dto/redeem-admin.dto';
export declare class RedeemAdminPoolService {
    private readonly prisma;
    private readonly defs;
    constructor(prisma: PrismaService, defs: RedeemAdminDefsService);
    createScratchReward(adminId: string, dto: CreateRedeemCodeDto): Promise<{
        row: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            type: string;
            valueLabel: string;
            codeSecret: string;
            status: import(".prisma/client").$Enums.RedeemCodeStatus;
            cadence: string;
            mode: import(".prisma/client").$Enums.RedeemMode;
            stockLeft: number;
            coinCost: number | null;
            coinRewardMin: number | null;
            coinRewardMax: number | null;
            startsAt: Date | null;
            endsAt: Date | null;
            windowMinutes: number;
            codesPerWindow: number;
            expiresLabel: string;
            expiresAt: Date | null;
            tip: string;
            redeemUrl: string;
        };
        poolSize: number;
    }>;
    appendSecrets(redeemCodeId: string, raw: string[]): Promise<number>;
    unusedPoolCount(redeemCodeId: string): Promise<number>;
    normalizePool(raw?: string[]): string[];
}
