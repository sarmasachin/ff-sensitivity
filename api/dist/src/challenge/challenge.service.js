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
exports.ChallengeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const challenge_shared_1 = require("./challenge-shared");
let ChallengeService = class ChallengeService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async ensureDefaults() {
        await (0, challenge_shared_1.ensureChallengeDefaults)(this.prisma);
    }
    async adminGetBundle() {
        await (0, challenge_shared_1.ensureChallengeDefaults)(this.prisma);
        const [config, quiz, milestones] = await Promise.all([
            this.prisma.challengeConfig.findUniqueOrThrow({ where: { id: challenge_shared_1.CONFIG_ID } }),
            this.prisma.challengeQuizQuestion.findMany({
                orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            }),
            this.prisma.challengeMilestone.findMany({
                orderBy: { days: 'asc' },
            }),
        ]);
        return {
            rules: (0, challenge_shared_1.mapRules)(config),
            quiz: quiz.map((q) => (0, challenge_shared_1.mapQuizAdmin)(q)),
            milestones: milestones.map((m) => (0, challenge_shared_1.mapMilestone)(m)),
        };
    }
    async adminSave(adminId, dto) {
        if (dto.quiz !== undefined)
            (0, challenge_shared_1.assertQuizList)(dto.quiz);
        if (dto.milestones !== undefined)
            (0, challenge_shared_1.assertMilestoneList)(dto.milestones);
        const adBonusCooldownMinutes = (0, challenge_shared_1.resolveAdBonusCooldownMinutes)(dto.rules);
        const adBonusCooldownHours = adBonusCooldownMinutes <= 0
            ? 0
            : Math.min(168, Math.max(1, Math.ceil(adBonusCooldownMinutes / 60)));
        await this.prisma.$transaction(async (tx) => {
            await tx.challengeConfig.upsert({
                where: { id: challenge_shared_1.CONFIG_ID },
                update: {
                    missDayResetsStreak: dto.rules.missDayResetsStreak,
                    requireCheckIn: dto.rules.requireCheckIn,
                    requireQuiz: dto.rules.requireQuiz,
                    adBonusOptional: dto.rules.adBonusOptional,
                    adBonusCooldownHours,
                    adBonusCooldownMinutes,
                    scratchCardsPerDay: dto.rules.scratchCardsPerDay,
                    cardExpiresSameDay: dto.rules.cardExpiresSameDay,
                    firstMilestoneDays: dto.rules.firstMilestoneDays,
                    wrongAnswerLockHours: dto.rules.wrongAnswerLockHours,
                    wrongAnswerLockMinutes: dto.rules.wrongAnswerLockMinutes ?? 20,
                    quizOpenWindowHours: dto.rules.quizOpenWindowHours,
                    quizCorrectCoins: dto.rules.quizCorrectCoins,
                    quizWrongCoins: dto.rules.quizWrongCoins,
                },
                create: {
                    id: challenge_shared_1.CONFIG_ID,
                    ...challenge_shared_1.DEFAULT_RULES,
                    ...dto.rules,
                    adBonusCooldownHours,
                    adBonusCooldownMinutes,
                },
            });
            if (dto.quiz !== undefined) {
                await tx.challengeQuizQuestion.deleteMany({});
                if (dto.quiz.length) {
                    await tx.challengeQuizQuestion.createMany({
                        data: dto.quiz.map((q, i) => ({
                            id: (0, challenge_shared_1.sanitizeId)(q.id, `q_${i + 1}`),
                            question: q.question.trim(),
                            option0: q.options[0].trim(),
                            option1: q.options[1].trim(),
                            option2: q.options[2].trim(),
                            option3: q.options[3].trim(),
                            correctIndex: q.correctIndex,
                            enabled: q.enabled,
                            sortOrder: i,
                        })),
                    });
                }
            }
            if (dto.milestones !== undefined) {
                await tx.challengeMilestone.deleteMany({});
                if (dto.milestones.length) {
                    await tx.challengeMilestone.createMany({
                        data: dto.milestones.map((m) => ({
                            id: (0, challenge_shared_1.sanitizeId)(m.id, `m${m.days}`),
                            days: m.days,
                            title: m.title.trim(),
                            rewardLabel: m.rewardLabel.trim(),
                            coinReward: m.coinReward,
                            badge: m.badge?.trim() ? m.badge.trim().slice(0, 80) : null,
                            enabled: m.enabled,
                        })),
                    });
                }
            }
            await tx.auditLog.create({
                data: {
                    actorAdminId: adminId,
                    action: 'challenge.save',
                    entity: 'challenge_config:default',
                    afterJson: {
                        quizCount: dto.quiz?.length ?? null,
                        milestoneCount: dto.milestones?.length ?? null,
                        quizCorrectCoins: dto.rules.quizCorrectCoins,
                        quizWrongCoins: dto.rules.quizWrongCoins,
                    },
                },
            });
        });
        return this.adminGetBundle();
    }
};
exports.ChallengeService = ChallengeService;
exports.ChallengeService = ChallengeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ChallengeService);
//# sourceMappingURL=challenge.service.js.map