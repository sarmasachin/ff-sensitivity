import { PrismaService } from '../prisma/prisma.service';
export declare class RedeemCommentService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(redeemCodeId: string): Promise<{
        items: {
            id: string;
            name: string;
            text: string;
            createdAt: string;
        }[];
    }>;
    add(userId: string, redeemCodeId: string, name: string, text: string): Promise<{
        id: string;
        name: string;
        text: string;
        createdAt: string;
    }>;
    private requireCode;
}
