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
            scratchCardsPerDay: number;
            cardExpiresSameDay: boolean;
            firstMilestoneDays: number;
            wrongAnswerLockHours: number;
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
            scratchCardsPerDay: number;
            cardExpiresSameDay: boolean;
            firstMilestoneDays: number;
            wrongAnswerLockHours: number;
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
        rules: {
            missDayResetsStreak: boolean;
            requireCheckIn: boolean;
            requireQuiz: boolean;
            adBonusOptional: boolean;
            scratchCardsPerDay: number;
            cardExpiresSameDay: boolean;
            firstMilestoneDays: number;
            wrongAnswerLockHours: number;
            quizOpenWindowHours: number;
            quizCorrectCoins: number;
            quizWrongCoins: number;
        };
        question: {
            id: string;
            question: string;
            options: string[];
        } | null;
        quizState: {
            alreadyCorrect: boolean;
            wrongAttempts: number;
            maxWrongAttempts: number;
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
        openUntilMs: number | null;
        wrongAnswerLockHours: number;
        quizOpenWindowHours: number;
        coins: number;
        delta: number;
        alreadyApplied: boolean;
        reason: string;
    }>;
    private pickTodayQuestion;
    private utcDayOfYear;
    private mapRules;
    private mapQuizAdmin;
    private mapMilestone;
    private sanitizeId;
    private assertQuizList;
    private assertMilestoneList;
}
