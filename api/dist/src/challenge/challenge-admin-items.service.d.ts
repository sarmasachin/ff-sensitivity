import { PrismaService } from '../prisma/prisma.service';
import type { MilestoneDto, QuizQuestionDto } from './dto/challenge.dto';
export declare class ChallengeAdminItemsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createQuiz(adminId: string, dto: QuizQuestionDto): Promise<{
        id: string;
        question: string;
        options: [string, string, string, string];
        correctIndex: number;
        enabled: boolean;
    }>;
    updateQuiz(adminId: string, rawId: string, dto: QuizQuestionDto): Promise<{
        id: string;
        question: string;
        options: [string, string, string, string];
        correctIndex: number;
        enabled: boolean;
    }>;
    deleteQuiz(adminId: string, rawId: string): Promise<{
        ok: true;
        id: string;
    }>;
    createMilestone(adminId: string, dto: MilestoneDto): Promise<{
        id: string;
        days: number;
        title: string;
        rewardLabel: string;
        coinReward: number;
        badge: string | null;
        enabled: boolean;
    }>;
    updateMilestone(adminId: string, rawId: string, dto: MilestoneDto): Promise<{
        id: string;
        days: number;
        title: string;
        rewardLabel: string;
        coinReward: number;
        badge: string | null;
        enabled: boolean;
    }>;
    deleteMilestone(adminId: string, rawId: string): Promise<{
        ok: true;
        id: string;
    }>;
}
