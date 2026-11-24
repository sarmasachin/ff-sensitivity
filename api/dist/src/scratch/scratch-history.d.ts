import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export type ScratchHistoryItem = {
    id: string;
    kind: 'GIFT' | 'REDEEM' | 'MILESTONE' | 'SHOP';
    title: string;
    detail: string;
    rewardLabel: string;
    code: string | null;
    coins: number;
    badge: string | null;
    scratchedAt: string;
};
type Tx = PrismaService | Prisma.TransactionClient;
export declare function saveScratchArchive(prisma: Tx, row: {
    userId: string;
    sourceKey: string;
    kind: 'MILESTONE' | 'SHOP';
    title: string;
    detail: string;
    rewardLabel: string;
    coins: number;
    badge?: string | null;
}): Promise<void>;
export declare function listScratchHistory(prisma: PrismaService, userId: string): Promise<{
    retentionDays: number;
    showExpired: boolean;
    items: ScratchHistoryItem[];
}>;
export {};
