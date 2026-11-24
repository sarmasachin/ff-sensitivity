import { PrismaService } from '../prisma/prisma.service';
import { EconomyService } from '../economy/economy.service';
import { AnalyticsService } from '../analytics/analytics.service';
export declare class ChallengeUserService {
    private readonly prisma;
    private readonly economy;
    private readonly analytics;
    constructor(prisma: PrismaService, economy: EconomyService, analytics: AnalyticsService);
    today(userId: string): Promise<{
        dayKey: string;
        dayOfYear: number;
        streakDays: number;
        checkinDone: boolean;
        adDone: boolean;
        adAvailable: boolean;
        nextAdAvailableAtMs: number | null;
        claimedMilestoneDays: number[];
        rules: {
            checkinCoins: number;
            adBonusCoins: number;
            checkInEnabled: boolean;
            quizEnabled: boolean;
            walletCap: number;
            dailyEarnCap: number;
            missDayResetsStreak: boolean;
            requireCheckIn: boolean;
            requireQuiz: boolean;
            adBonusOptional: boolean;
            adBonusCooldownHours: number;
            adBonusCooldownMinutes: number;
            scratchCardsPerDay: number;
            cardExpiresSameDay: boolean;
            firstMilestoneDays: number;
            wrongAnswerLockHours: number;
            wrongAnswerLockMinutes: number;
            quizOpenWindowHours: number;
            quizCorrectCoins: number;
            quizWrongCoins: number;
        };
        question: {
            id: string;
            question: string;
            options: [string, string, string, string];
        } | null;
        quizState: {
            alreadyCorrect: boolean;
            wrongAttempts: number;
            maxWrongAttempts: number;
            lockUntilMs: number | null;
            openUntilMs: null;
            secondChanceReady: boolean;
            secondChanceUnlocked: boolean;
        };
        milestones: {
            id: string;
            days: number;
            title: string;
            rewardLabel: string;
            coinReward: number;
            badge: string | null;
            enabled: boolean;
        }[];
    }>;
    submitQuiz(userId: string, questionId: string, selectedIndex: number): Promise<{
        correct: boolean;
        questionId: string;
        selectedIndex: number;
        lockUntilMs: number | null;
        openUntilMs: null;
        secondChanceReady: boolean;
        wrongAnswerLockMinutes: number;
        coins: number;
        delta: number;
        alreadyApplied: boolean;
        reason: string;
    }>;
    unlockSecondChance(userId: string): Promise<{
        alreadyUnlocked: boolean;
        question: {
            id: string;
            question: string;
            options: string[];
        };
    }>;
}
