import { PrismaService } from '../prisma/prisma.service';
export declare function userAllowsPush(prisma: PrismaService, userId: string): Promise<boolean>;
