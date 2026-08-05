import type { AuthUser } from '../user-auth/current-user.decorator';
import { ChallengeService } from './challenge.service';
import { SubmitQuizDto } from './dto/challenge.dto';
export declare class ChallengeController {
    private readonly challenge;
    constructor(challenge: ChallengeService);
    today(user: AuthUser): Promise<{
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
    submitQuiz(user: AuthUser, dto: SubmitQuizDto): Promise<{
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
}
