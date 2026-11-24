import { PrismaService } from '../prisma/prisma.service';
export type RedeemVoteTally = {
    yesCount: number;
    noCount: number;
    myVote: boolean | null;
};
export declare class RedeemVoteService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    cast(userId: string, redeemCodeId: string, worked: boolean): Promise<{
        worked: boolean;
        yesCount: number;
        noCount: number;
    }>;
    tally(userId: string, codeIds: string[]): Promise<Map<string, RedeemVoteTally>>;
}
