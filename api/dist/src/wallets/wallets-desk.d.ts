import type { PrismaService } from '../prisma/prisma.service';
export type WalletDeskStats = {
    total: number;
    frozen: number;
    zero: number;
    coinsInCirculation: number;
    staffMoves: number;
};
export type WalletLife = {
    earned: number;
    spent: number;
    lastAt: Date | null;
};
export declare function countWalletDeskStats(prisma: PrismaService): Promise<WalletDeskStats>;
export declare function loadWalletLifetimes(prisma: PrismaService): Promise<Map<string, WalletLife>>;
export declare function loadWalletLifetime(prisma: PrismaService, userId: string): Promise<WalletLife | undefined>;
