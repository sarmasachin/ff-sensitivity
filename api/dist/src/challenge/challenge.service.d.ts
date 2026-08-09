import { PrismaService } from '../prisma/prisma.service';
import { EconomyService } from '../economy/economy.service';
import { AnalyticsService } from '../analytics/analytics.service';
import type { SaveChallengeDto } from './dto/challenge.dto';
export declare class ChallengeService {
    private readonly prisma;
    private readonly economy;
    private readonly analytics;
    constructor(prisma: PrismaService, economy: EconomyService, analytics: AnalyticsService);
    ensureDefaults(): Promise<void>;
    adminGetBundle(): Promise<{
        rules: {
            missDayResetsStreak: boolean;
            requireCheckIn: boolean;
            requireQuiz: boolean;
            adBonusOptional: boolean;
            adBonusCooldownHours: number;
            scratchCardsPerDay: number;
            cardExpiresSameDay: boolean;
            firstMilestoneDays: number;
            wrongAnswerLockHours: number;
            wrongAnswerLockMinutes: number;
            quizOpenWindowHours: number;
            quizCorrectCoins: number;
            quizWrongCoins: number;
        };
        quiz: {
            id: string;
            question: string;
            options: [string, string, string, string];
            correctIndex: number;
            enabled: boolean;
        }[];
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
    adminSave(adminId: string, dto: SaveChallengeDto): Promise<{
        rules: {
            missDayResetsStreak: boolean;
            requireCheckIn: boolean;
            requireQuiz: boolean;
            adBonusOptional: boolean;
            adBonusCooldownHours: number;
            scratchCardsPerDay: number;
            cardExpiresSameDay: boolean;
            firstMilestoneDays: number;
            wrongAnswerLockHours: number;
            wrongAnswerLockMinutes: number;
            quizOpenWindowHours: number;
            quizCorrectCoins: number;
            quizWrongCoins: number;
        };
        quiz: {
            id: string;
            question: string;
            options: [string, string, string, string];
            correctIndex: number;
            enabled: boolean;
        }[];
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
    userToday(userId: string): Promise<{
        dayKey: string;
        dayOfYear: number;
        streakDays: number;
        checkinDone: boolean;
        adDone: boolean;
        adAvailable: boolean;
        nextAdAvailableAtMs: number | null;
        claimedMilestoneDays: number[];
        rules: {
            missDayResetsStreak: boolean;
            requireCheckIn: boolean;
            requireQuiz: boolean;
            adBonusOptional: boolean;
            adBonusCooldownHours: number;
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
    userSubmitQuiz(userId: string, questionId: string, selectedIndex: number): Promise<{
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
    userUnlockSecondChance(userId: string): Promise<{
        alreadyUnlocked: boolean;
        question: {
            id: string;
            question: string;
            options: string[];
        };
    }>;
    private pickSecondChanceQuestion;
    private pickTodayQuestion;
    private utcDayOfYear;
    private utcEpochDay;
    private mapRules;
    private mapQuizAdmin;
    private mapMilestone;
    private sanitizeId;
    private assertQuizList;
    private assertMilestoneList;
}
