import { PrismaService } from '../prisma/prisma.service';
export declare class EconomyService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getWallet(userId: string): Promise<{
        coins: number;
        frozen: boolean;
        boosts: {
            [k: string]: number;
        };
        ownedShopIds: string[];
        shopBuyCounts: Record<string, number>;
    }>;
    earnChallenge(userId: string, kind: 'CHECKIN' | 'QUIZ' | 'AD' | 'MILESTONE', opts: {
        correct?: boolean;
        milestoneDays?: number;
    }): Promise<{
        coins: number;
        delta: number;
        alreadyApplied: boolean;
        reason: string;
    }>;
    purchaseShop(userId: string, itemId: string, requestId: string): Promise<{
        coins: number;
        itemId: string;
        alreadyApplied: boolean;
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
    requireUserPublic(userId: string): Promise<{
        id: string;
        email: string;
        isActive: boolean;
        lastLoginAt: Date | null;
        displayName: string;
        createdAt: Date;
        updatedAt: Date;
        streakDays: number;
        googleSub: string;
        photoUrl: string | null;
        coins: number;
        lastCheckinDay: string | null;
        walletFrozen: boolean;
        walletNote: string;
        isRestricted: boolean;
        accountNote: string;
        tokenVersion: number;
    }>;
    private earnCheckin;
    private earnQuiz;
    private earnAd;
    private earnMilestone;
    private applyEarn;
    private requireUser;
    private assertNotFrozen;
}
