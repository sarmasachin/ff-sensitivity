import { PrismaService } from '../prisma/prisma.service';
import type { SaveChallengeDto } from './dto/challenge.dto';
export declare class ChallengeService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    ensureDefaults(): Promise<void>;
    adminGetBundle(): Promise<{
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
    adminSave(adminId: string, dto: SaveChallengeDto): Promise<{
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
}
