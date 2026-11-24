import { RedeemCodeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export declare function assertScratchCardOpen(code: {
    status: RedeemCodeStatus;
    startsAt: Date | null;
    endsAt: Date | null;
    expiresAt: Date | null;
    createdAt: Date;
}, now: Date): void;
export declare function assertRedeemSeat(prisma: PrismaService, userId: string): Promise<void>;
