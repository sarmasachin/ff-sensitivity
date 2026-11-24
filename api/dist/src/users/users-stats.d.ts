import type { PrismaService } from '../prisma/prisma.service';
export type UserDeskStats = {
    total: number;
    active: number;
    restricted: number;
    suspended: number;
    deleted: number;
    coinsHeld: number;
};
export declare function countUserDeskStats(prisma: PrismaService): Promise<UserDeskStats>;
