import type { PrismaService } from '../prisma/prisma.service';
export type DeviceDeskStats = {
    total: number;
    active: number;
    stale: number;
    blocked: number;
    withToken: number;
};
export declare function countDeviceDeskStats(prisma: PrismaService, now?: Date): Promise<DeviceDeskStats>;
