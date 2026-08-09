import type { AuthAdmin } from '../auth/current-admin.decorator';
import { ChallengeService } from './challenge.service';
import { SaveChallengeDto } from './dto/challenge.dto';
export declare class ChallengeAdminController {
    private readonly challenge;
    constructor(challenge: ChallengeService);
    get(): Promise<{
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
    save(admin: AuthAdmin, dto: SaveChallengeDto): Promise<{
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
}
