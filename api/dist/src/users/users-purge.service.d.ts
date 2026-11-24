import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
export declare class UsersPurgeService implements OnModuleInit, OnModuleDestroy {
    private readonly prisma;
    private readonly log;
    private timer;
    constructor(prisma: PrismaService);
    onModuleInit(): void;
    onModuleDestroy(): void;
    runOnce(): Promise<{
        purged: number;
        cutoff: string;
    }>;
}
