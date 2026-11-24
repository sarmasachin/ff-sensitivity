import type { AuthAdmin } from '../auth/current-admin.decorator';
import { ChallengeService } from './challenge.service';
import { ChallengeAdminItemsService } from './challenge-admin-items.service';
import { MilestoneDto, QuizQuestionDto, SaveChallengeDto } from './dto/challenge.dto';
export declare class ChallengeAdminController {
    private readonly challenge;
    private readonly items;
    constructor(challenge: ChallengeService, items: ChallengeAdminItemsService);
    get(): Promise<{
        rules: {
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
    save(admin: AuthAdmin, dto: SaveChallengeDto): Promise<{
        rules: {
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
    createQuiz(admin: AuthAdmin, dto: QuizQuestionDto): Promise<{
        id: string;
        question: string;
        options: [string, string, string, string];
        correctIndex: number;
        enabled: boolean;
    }>;
    updateQuiz(admin: AuthAdmin, id: string, dto: QuizQuestionDto): Promise<{
        id: string;
        question: string;
        options: [string, string, string, string];
        correctIndex: number;
        enabled: boolean;
    }>;
    deleteQuiz(admin: AuthAdmin, id: string): Promise<{
        ok: true;
        id: string;
    }>;
    createMilestone(admin: AuthAdmin, dto: MilestoneDto): Promise<{
        id: string;
        days: number;
        title: string;
        rewardLabel: string;
        coinReward: number;
        badge: string | null;
        enabled: boolean;
    }>;
    updateMilestone(admin: AuthAdmin, id: string, dto: MilestoneDto): Promise<{
        id: string;
        days: number;
        title: string;
        rewardLabel: string;
        coinReward: number;
        badge: string | null;
        enabled: boolean;
    }>;
    deleteMilestone(admin: AuthAdmin, id: string): Promise<{
        ok: true;
        id: string;
    }>;
}
