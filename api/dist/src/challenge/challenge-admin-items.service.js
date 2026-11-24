"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChallengeAdminItemsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const app_error_1 = require("../common/errors/app-error");
const challenge_shared_1 = require("./challenge-shared");
let ChallengeAdminItemsService = class ChallengeAdminItemsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createQuiz(adminId, dto) {
        (0, challenge_shared_1.assertQuizList)([dto]);
        const count = await this.prisma.challengeQuizQuestion.count();
        if (count >= 1500) {
            throw new app_error_1.AppError('CHALLENGE_QUIZ_LIMIT', 'Too many questions (max 1500).', 400);
        }
        const id = (0, challenge_shared_1.sanitizeId)(dto.id, 'q');
        const first = await this.prisma.challengeQuizQuestion.findFirst({
            orderBy: { sortOrder: 'asc' },
            select: { sortOrder: true },
        });
        try {
            const row = await this.prisma.challengeQuizQuestion.create({
                data: {
                    id,
                    question: dto.question.trim(),
                    option0: dto.options[0].trim(),
                    option1: dto.options[1].trim(),
                    option2: dto.options[2].trim(),
                    option3: dto.options[3].trim(),
                    correctIndex: dto.correctIndex,
                    enabled: dto.enabled,
                    sortOrder: (first?.sortOrder ?? 0) - 1,
                },
            });
            await (0, challenge_shared_1.auditChallenge)(this.prisma, adminId, 'challenge.quiz.create', `quiz:${id}`, {
                id,
                question: row.question,
            });
            return (0, challenge_shared_1.mapQuizAdmin)(row);
        }
        catch (e) {
            (0, challenge_shared_1.rethrowUnique)(e, 'CHALLENGE_DUP_QUIZ', `Question id already exists: ${id}`);
        }
    }
    async updateQuiz(adminId, rawId, dto) {
        (0, challenge_shared_1.assertQuizList)([dto]);
        const id = (0, challenge_shared_1.sanitizeId)(rawId, 'q');
        const existing = await this.prisma.challengeQuizQuestion.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new app_error_1.AppError('CHALLENGE_QUIZ_NOT_FOUND', 'Question not found.', 404);
        }
        const row = await this.prisma.challengeQuizQuestion.update({
            where: { id },
            data: {
                question: dto.question.trim(),
                option0: dto.options[0].trim(),
                option1: dto.options[1].trim(),
                option2: dto.options[2].trim(),
                option3: dto.options[3].trim(),
                correctIndex: dto.correctIndex,
                enabled: dto.enabled,
            },
        });
        await (0, challenge_shared_1.auditChallenge)(this.prisma, adminId, 'challenge.quiz.update', `quiz:${id}`, {
            id,
        });
        return (0, challenge_shared_1.mapQuizAdmin)(row);
    }
    async deleteQuiz(adminId, rawId) {
        const id = (0, challenge_shared_1.sanitizeId)(rawId, 'q');
        const deleted = await this.prisma.challengeQuizQuestion.deleteMany({
            where: { id },
        });
        if (deleted.count === 0) {
            throw new app_error_1.AppError('CHALLENGE_QUIZ_NOT_FOUND', 'Question not found.', 404);
        }
        await (0, challenge_shared_1.auditChallenge)(this.prisma, adminId, 'challenge.quiz.delete', `quiz:${id}`, {
            id,
        });
        return { ok: true, id };
    }
    async createMilestone(adminId, dto) {
        (0, challenge_shared_1.assertMilestoneList)([dto]);
        const id = (0, challenge_shared_1.sanitizeId)(dto.id, `m${dto.days}`);
        try {
            const row = await this.prisma.challengeMilestone.create({
                data: {
                    id,
                    days: dto.days,
                    title: dto.title.trim(),
                    rewardLabel: dto.rewardLabel.trim(),
                    coinReward: dto.coinReward,
                    badge: dto.badge?.trim() ? dto.badge.trim().slice(0, 80) : null,
                    enabled: dto.enabled,
                },
            });
            await (0, challenge_shared_1.auditChallenge)(this.prisma, adminId, 'challenge.milestone.create', `milestone:${id}`, { id, days: row.days });
            return (0, challenge_shared_1.mapMilestone)(row);
        }
        catch (e) {
            (0, challenge_shared_1.rethrowUnique)(e, 'CHALLENGE_DUP_MS', 'Milestone id or day already exists.');
        }
    }
    async updateMilestone(adminId, rawId, dto) {
        (0, challenge_shared_1.assertMilestoneList)([dto]);
        const id = (0, challenge_shared_1.sanitizeId)(rawId, `m${dto.days}`);
        const existing = await this.prisma.challengeMilestone.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new app_error_1.AppError('CHALLENGE_MS_NOT_FOUND', 'Milestone not found.', 404);
        }
        const clash = await this.prisma.challengeMilestone.findFirst({
            where: { days: dto.days, NOT: { id } },
            select: { id: true },
        });
        if (clash) {
            throw new app_error_1.AppError('CHALLENGE_DUP_DAYS', `Duplicate milestone day: ${dto.days}`, 400);
        }
        try {
            const row = await this.prisma.challengeMilestone.update({
                where: { id },
                data: {
                    days: dto.days,
                    title: dto.title.trim(),
                    rewardLabel: dto.rewardLabel.trim(),
                    coinReward: dto.coinReward,
                    badge: dto.badge?.trim() ? dto.badge.trim().slice(0, 80) : null,
                    enabled: dto.enabled,
                },
            });
            await (0, challenge_shared_1.auditChallenge)(this.prisma, adminId, 'challenge.milestone.update', `milestone:${id}`, { id, days: row.days });
            return (0, challenge_shared_1.mapMilestone)(row);
        }
        catch (e) {
            (0, challenge_shared_1.rethrowUnique)(e, 'CHALLENGE_DUP_DAYS', `Duplicate milestone day: ${dto.days}`);
        }
    }
    async deleteMilestone(adminId, rawId) {
        const id = (0, challenge_shared_1.sanitizeId)(rawId, 'm');
        const deleted = await this.prisma.challengeMilestone.deleteMany({
            where: { id },
        });
        if (deleted.count === 0) {
            throw new app_error_1.AppError('CHALLENGE_MS_NOT_FOUND', 'Milestone not found.', 404);
        }
        await (0, challenge_shared_1.auditChallenge)(this.prisma, adminId, 'challenge.milestone.delete', `milestone:${id}`, { id });
        return { ok: true, id };
    }
};
exports.ChallengeAdminItemsService = ChallengeAdminItemsService;
exports.ChallengeAdminItemsService = ChallengeAdminItemsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ChallengeAdminItemsService);
//# sourceMappingURL=challenge-admin-items.service.js.map