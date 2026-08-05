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
const app_error_1 = require("../common/errors/app-error");
const economy_service_1 = require("../economy/economy.service");
const analytics_service_1 = require("../analytics/analytics.service");
const economy_catalog_1 = require("../economy/economy-catalog");
const CONFIG_ID = 'default';
const DEFAULT_RULES = {
    missDayResetsStreak: true,
    requireCheckIn: true,
    requireQuiz: true,
    adBonusOptional: true,
    scratchCardsPerDay: 1,
    cardExpiresSameDay: true,
    firstMilestoneDays: 7,
    wrongAnswerLockHours: 4,
    quizOpenWindowHours: 2,
    quizCorrectCoins: 50,
    quizWrongCoins: -10,
    checkinCoins: 20,
    adBonusCoins: 30,
};
let ChallengeService = class ChallengeService {
    prisma;
    economy;
    analytics;
    constructor(prisma, economy, analytics) {
        this.prisma = prisma;
        this.economy = economy;
        this.analytics = analytics;
    }
    async ensureDefaults() {
        await this.prisma.challengeConfig.upsert({
            where: { id: CONFIG_ID },
            update: {},
            create: { id: CONFIG_ID, ...DEFAULT_RULES },
        });
    }
    async adminGetBundle() {
        await this.ensureDefaults();
        const [config, quiz, milestones] = await Promise.all([
            this.prisma.challengeConfig.findUniqueOrThrow({ where: { id: CONFIG_ID } }),
            this.prisma.challengeQuizQuestion.findMany({
                orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            }),
            this.prisma.challengeMilestone.findMany({
                orderBy: { days: 'asc' },
            }),
        ]);
        return {
            rules: this.mapRules(config),
            quiz: quiz.map((q) => this.mapQuizAdmin(q)),
            milestones: milestones.map((m) => this.mapMilestone(m)),
        };
    }
    async adminSave(adminId, dto) {
        this.assertQuizList(dto.quiz);
        this.assertMilestoneList(dto.milestones);
        await this.prisma.$transaction(async (tx) => {
            await tx.challengeConfig.upsert({
                where: { id: CONFIG_ID },
                update: {
                    missDayResetsStreak: dto.rules.missDayResetsStreak,
                    requireCheckIn: dto.rules.requireCheckIn,
                    requireQuiz: dto.rules.requireQuiz,
                    adBonusOptional: dto.rules.adBonusOptional,
                    scratchCardsPerDay: dto.rules.scratchCardsPerDay,
                    cardExpiresSameDay: dto.rules.cardExpiresSameDay,
                    firstMilestoneDays: dto.rules.firstMilestoneDays,
                    wrongAnswerLockHours: dto.rules.wrongAnswerLockHours,
                    quizOpenWindowHours: dto.rules.quizOpenWindowHours,
                    quizCorrectCoins: dto.rules.quizCorrectCoins,
                    quizWrongCoins: dto.rules.quizWrongCoins,
                },
                create: {
                    id: CONFIG_ID,
                    ...DEFAULT_RULES,
                    ...dto.rules,
                },
            });
            await tx.challengeQuizQuestion.deleteMany({});
            if (dto.quiz.length) {
                await tx.challengeQuizQuestion.createMany({
                    data: dto.quiz.map((q, i) => ({
                        id: this.sanitizeId(q.id, `q_${i + 1}`),
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
            await tx.challengeMilestone.deleteMany({});
            if (dto.milestones.length) {
                await tx.challengeMilestone.createMany({
                    data: dto.milestones.map((m) => ({
                        id: this.sanitizeId(m.id, `m${m.days}`),
                        days: m.days,
                        title: m.title.trim(),
                        rewardLabel: m.rewardLabel.trim(),
                        coinReward: m.coinReward,
                        badge: m.badge?.trim() ? m.badge.trim().slice(0, 80) : null,
                        enabled: m.enabled,
                    })),
                });
            }
            await tx.auditLog.create({
                data: {
                    actorAdminId: adminId,
                    action: 'challenge.save',
                    entity: 'challenge_config:default',
                    afterJson: {
                        quizCount: dto.quiz.length,
                        milestoneCount: dto.milestones.length,
                        quizCorrectCoins: dto.rules.quizCorrectCoins,
                        quizWrongCoins: dto.rules.quizWrongCoins,
                    },
                },
            });
        });
        return this.adminGetBundle();
    }
    async userToday(userId) {
        await this.ensureDefaults();
        await this.economy.requireUserPublic(userId);
        const [config, enabledQuiz, milestones] = await Promise.all([
            this.prisma.challengeConfig.findUniqueOrThrow({ where: { id: CONFIG_ID } }),
            this.prisma.challengeQuizQuestion.findMany({
                where: { enabled: true },
                orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            }),
            this.prisma.challengeMilestone.findMany({
                where: { enabled: true },
                orderBy: { days: 'asc' },
            }),
        ]);
        const dayOfYear = this.utcDayOfYear();
        const todayQ = this.pickTodayQuestion(enabledQuiz, dayOfYear);
        const day = (0, economy_catalog_1.utcDateKey)();
        const alreadyCorrect = await this.prisma.walletLedger.findFirst({
            where: {
                userId,
                idempotencyKey: `earn:quiz:ok:${userId}:${day}`,
            },
            select: { id: true },
        });
        const wrongCount = await this.prisma.walletLedger.count({
            where: {
                userId,
                reason: 'earn:quiz:wrong',
                idempotencyKey: { startsWith: `earn:quiz:wrong:${userId}:${day}:` },
            },
        });
        return {
            dayKey: day,
            dayOfYear,
            rules: this.mapRules(config),
            question: todayQ
                ? {
                    id: todayQ.id,
                    question: todayQ.question,
                    options: [
                        todayQ.option0,
                        todayQ.option1,
                        todayQ.option2,
                        todayQ.option3,
                    ],
                }
                : null,
            quizState: {
                alreadyCorrect: !!alreadyCorrect,
                wrongAttempts: wrongCount,
                maxWrongAttempts: 2,
            },
            milestones: milestones.map((m) => this.mapMilestone(m)),
        };
    }
    async userSubmitQuiz(userId, questionId, selectedIndex) {
        await this.ensureDefaults();
        const qid = questionId?.trim() ?? '';
        if (!qid || qid.length > 64 || qid.includes('/')) {
            throw new app_error_1.AppError('CHALLENGE_BAD_QUESTION', 'Invalid question id.', 400);
        }
        if (![0, 1, 2, 3].includes(selectedIndex)) {
            throw new app_error_1.AppError('CHALLENGE_BAD_OPTION', 'Invalid option index.', 400);
        }
        const enabledQuiz = await this.prisma.challengeQuizQuestion.findMany({
            where: { enabled: true },
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        });
        const todayQ = this.pickTodayQuestion(enabledQuiz, this.utcDayOfYear());
        if (!todayQ) {
            throw new app_error_1.AppError('CHALLENGE_NO_QUIZ', 'No quiz available today.', 409);
        }
        if (todayQ.id !== qid) {
            throw new app_error_1.AppError('CHALLENGE_WRONG_QUESTION', 'That is not today’s question.', 409);
        }
        const day = (0, economy_catalog_1.utcDateKey)();
        const config = await this.prisma.challengeConfig.findUniqueOrThrow({
            where: { id: CONFIG_ID },
        });
        const lockMs = config.wrongAnswerLockHours * 60 * 60 * 1000;
        const openMs = config.quizOpenWindowHours * 60 * 60 * 1000;
        const now = Date.now();
        const alreadyCorrect = await this.prisma.walletLedger.findFirst({
            where: {
                userId,
                idempotencyKey: `earn:quiz:ok:${userId}:${day}`,
            },
            select: { id: true, balanceAfter: true, delta: true, reason: true },
        });
        if (alreadyCorrect) {
            throw new app_error_1.AppError('CHALLENGE_ALREADY_DONE', 'Quiz already answered correctly today.', 409);
        }
        const lastWrong = await this.prisma.walletLedger.findFirst({
            where: {
                userId,
                reason: 'earn:quiz:wrong',
                idempotencyKey: { startsWith: `earn:quiz:wrong:${userId}:${day}:` },
            },
            orderBy: { createdAt: 'desc' },
        });
        if (lastWrong) {
            const lockUntil = lastWrong.createdAt.getTime() + lockMs;
            const openUntil = lockUntil + openMs;
            if (now < lockUntil) {
                throw new app_error_1.AppError('CHALLENGE_QUIZ_LOCKED', 'Quiz locked — wait for the countdown.', 409);
            }
            if (now > openUntil) {
                throw new app_error_1.AppError('CHALLENGE_QUIZ_CLOSED', 'Quiz closed for today.', 409);
            }
        }
        const correct = todayQ.correctIndex === selectedIndex;
        const earn = await this.economy.earnQuizGraded(userId, correct, {
            correctCoins: config.quizCorrectCoins,
            wrongCoins: config.quizWrongCoins,
        });
        this.analytics.trackSafe({
            name: 'challenge_quiz_submit',
            userId,
            props: { correct },
        });
        return {
            ...earn,
            correct,
            questionId: todayQ.id,
            selectedIndex,
            lockUntilMs: correct ? null : now + lockMs,
            openUntilMs: correct ? null : now + lockMs + openMs,
            wrongAnswerLockHours: config.wrongAnswerLockHours,
            quizOpenWindowHours: config.quizOpenWindowHours,
        };
    }
    pickTodayQuestion(rows, dayOfYear) {
        if (!rows.length)
            return null;
        const index = ((dayOfYear - 1) % rows.length + rows.length) % rows.length;
        return rows[index] ?? null;
    }
    utcDayOfYear(d = new Date()) {
        const start = Date.UTC(d.getUTCFullYear(), 0, 0);
        const now = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
        return Math.floor((now - start) / 86_400_000);
    }
    mapRules(c) {
        return {
            missDayResetsStreak: c.missDayResetsStreak,
            requireCheckIn: c.requireCheckIn,
            requireQuiz: c.requireQuiz,
            adBonusOptional: c.adBonusOptional,
            scratchCardsPerDay: c.scratchCardsPerDay,
            cardExpiresSameDay: c.cardExpiresSameDay,
            firstMilestoneDays: c.firstMilestoneDays,
            wrongAnswerLockHours: c.wrongAnswerLockHours,
            quizOpenWindowHours: c.quizOpenWindowHours,
            quizCorrectCoins: c.quizCorrectCoins,
            quizWrongCoins: c.quizWrongCoins,
        };
    }
    mapQuizAdmin(q) {
        return {
            id: q.id,
            question: q.question,
            options: [q.option0, q.option1, q.option2, q.option3],
            correctIndex: q.correctIndex,
            enabled: q.enabled,
        };
    }
    mapMilestone(m) {
        return {
            id: m.id,
            days: m.days,
            title: m.title,
            rewardLabel: m.rewardLabel,
            coinReward: m.coinReward,
            badge: m.badge,
            enabled: m.enabled,
        };
    }
    sanitizeId(raw, fallback) {
        const id = (raw?.trim() || fallback)
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_-]/g, '')
            .slice(0, 64);
        if (!id || id.includes('/')) {
            throw new app_error_1.AppError('CHALLENGE_BAD_ID', 'Invalid id.', 400);
        }
        return id;
    }
    assertQuizList(quiz) {
        if (quiz.length > 200) {
            throw new app_error_1.AppError('CHALLENGE_QUIZ_LIMIT', 'Too many questions.', 400);
        }
        const ids = new Set();
        for (const q of quiz) {
            if (!Array.isArray(q.options) || q.options.length !== 4) {
                throw new app_error_1.AppError('CHALLENGE_BAD_OPTIONS', 'Each quiz needs 4 options.', 400);
            }
            if (q.options.some((o) => !o?.trim())) {
                throw new app_error_1.AppError('CHALLENGE_BAD_OPTIONS', 'Options cannot be blank.', 400);
            }
            const id = this.sanitizeId(q.id, 'q');
            if (ids.has(id)) {
                throw new app_error_1.AppError('CHALLENGE_DUP_QUIZ', `Duplicate quiz id: ${id}`, 400);
            }
            ids.add(id);
        }
    }
    assertMilestoneList(milestones) {
        if (milestones.length > 100) {
            throw new app_error_1.AppError('CHALLENGE_MS_LIMIT', 'Too many milestones.', 400);
        }
        const ids = new Set();
        const days = new Set();
        for (const m of milestones) {
            const id = this.sanitizeId(m.id, `m${m.days}`);
            if (ids.has(id)) {
                throw new app_error_1.AppError('CHALLENGE_DUP_MS', `Duplicate milestone id: ${id}`, 400);
            }
            if (days.has(m.days)) {
                throw new app_error_1.AppError('CHALLENGE_DUP_DAYS', `Duplicate milestone day: ${m.days}`, 400);
            }
            ids.add(id);
            days.add(m.days);
        }
    }
};
exports.ChallengeService = ChallengeService;
exports.ChallengeService = ChallengeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        economy_service_1.EconomyService,
        analytics_service_1.AnalyticsService])
], ChallengeService);
//# sourceMappingURL=challenge.service.js.map