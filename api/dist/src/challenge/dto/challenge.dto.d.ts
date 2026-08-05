export declare class ChallengeRulesDto {
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
}
export declare class QuizQuestionDto {
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    enabled: boolean;
}
export declare class MilestoneDto {
    id: string;
    days: number;
    title: string;
    rewardLabel: string;
    coinReward: number;
    badge?: string | null;
    enabled: boolean;
}
export declare class SaveChallengeDto {
    rules: ChallengeRulesDto;
    quiz: QuizQuestionDto[];
    milestones: MilestoneDto[];
}
export declare class SubmitQuizDto {
    questionId: string;
    selectedIndex: number;
}
