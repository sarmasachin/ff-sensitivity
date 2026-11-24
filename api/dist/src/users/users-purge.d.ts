import type { PrismaClient } from '@prisma/client';
export declare const DELETED_USER_RETENTION_DAYS = 90;
export declare const DELETED_USER_PURGE_INTERVAL_MS: number;
export declare const DELETED_USER_PURGE_BATCH = 100;
export declare function purgeDeletedUsers(prisma: PrismaClient): Promise<{
    purged: number;
    cutoff: string;
}>;
