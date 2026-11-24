import { PrismaService } from '../prisma/prisma.service';
export declare class EconomyEarnService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    earnChallenge(userId: string, kind: 'CHECKIN' | 'QUIZ' | 'AD' | 'MILESTONE', opts: {
        correct?: boolean;
        milestoneDays?: number;
    }): Promise<{
        coins: number;
        delta: number;
        alreadyApplied: boolean;
        reason: string;
    }>;
    earnQuizGraded(userId: string, correct: boolean, amounts: {
        correctCoins: number;
        wrongCoins: number;
    }): Promise<{
        coins: number;
        delta: number;
        alreadyApplied: boolean;
        reason: string;
    }>;
    earnScratchCoins(userId: string, day: string, slot: number, amount: number): Promise<{
        coins: number;
        delta: number;
        alreadyApplied: boolean;
        reason: string;
    }>;
    private earnCheckin;
    private earnQuiz;
    private earnAd;
    private earnMilestone;
    private applyEarn;
    private requireUser;
    private assertNotFrozen;
}
