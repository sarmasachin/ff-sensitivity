import type { AuthUser } from '../user-auth/current-user.decorator';
import { ChallengeService } from './challenge.service';
import { SubmitQuizDto } from './dto/challenge.dto';
export declare class ChallengeController {
    private readonly challenge;
    constructor(challenge: ChallengeService);
    today(user: AuthUser): Promise<{
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
    submitQuiz(user: AuthUser, dto: SubmitQuizDto): Promise<{
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
    unlockSecondChance(user: AuthUser): Promise<{
        alreadyUnlocked: boolean;
        question: {
            id: string;
            question: string;
            options: string[];
        };
    }>;
}
