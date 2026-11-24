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
exports.ChallengeUserService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const app_error_1 = require("../common/errors/app-error");
const economy_service_1 = require("../economy/economy.service");
const analytics_service_1 = require("../analytics/analytics.service");
const economy_catalog_1 = require("../economy/economy-catalog");
const challenge_shared_1 = require("./challenge-shared");
let ChallengeUserService = class ChallengeUserService {
    prisma;
    economy;
    analytics;
    constructor(prisma, economy, analytics) {
        this.prisma = prisma;
        this.economy = economy;
        this.analytics = analytics;
    }
    async today(userId) {
        await (0, challenge_shared_1.ensureChallengeDefaults)(this.prisma);
        await this.economy.requireUserPublic(userId);
        const [config, enabledQuiz, milestones] = await Promise.all([
            this.prisma.challengeConfig.findUniqueOrThrow({ where: { id: challenge_shared_1.CONFIG_ID } }),
            this.prisma.challengeQuizQuestion.findMany({
                where: { enabled: true },
                orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            }),
            this.prisma.challengeMilestone.findMany({
                where: { enabled: true },
                orderBy: { days: 'asc' },
            }),
        ]);
        const todayQ = (0, challenge_shared_1.pickTodayQuestion)(enabledQuiz, (0, challenge_shared_1.utcEpochDay)());
        const day = (0, economy_catalog_1.utcDateKey)();
        const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
            select: { streakDays: true },
        });
        const [alreadyCorrect, wrongCount, lastWrong, checkinDone, lastAd, milestoneRows] = await Promise.all([
            this.prisma.walletLedger.findFirst({
                where: { userId, idempotencyKey: `earn:quiz:ok:${userId}:${day}` },
                select: { id: true },
            }),
            this.prisma.walletLedger.count({
                where: {
                    userId,
                    reason: 'earn:quiz:wrong',
                    idempotencyKey: { startsWith: `earn:quiz:wrong:${userId}:${day}:` },
                },
            }),
            this.prisma.walletLedger.findFirst({
                where: {
                    userId,
                    reason: 'earn:quiz:wrong',
                    idempotencyKey: { startsWith: `earn:quiz:wrong:${userId}:${day}:` },
                },
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true },
            }),
            this.prisma.walletLedger.findFirst({
                where: { userId, idempotencyKey: `earn:checkin:${userId}:${day}` },
                select: { id: true },
            }),
            this.prisma.walletLedger.findFirst({
                where: { userId, reason: 'earn:ad' },
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true },
            }),
            this.prisma.walletLedger.findMany({
                where: { userId, reason: { startsWith: 'earn:milestone:' } },
                select: { reason: true },
            }),
        ]);
        const lockMs = Math.max(1, config.wrongAnswerLockMinutes ?? 20) *
            60 *
            1000;
        let lockUntilMs = null;
        let secondChanceReady = false;
        let secondChanceUnlocked = false;
        let secondChanceQuestion = null;
        const secondRow = await this.prisma.walletLedger.findFirst({
            where: { userId, idempotencyKey: `quiz:second:${userId}:${day}` },
            select: { reason: true },
        });
        if (secondRow?.reason?.startsWith('quiz:second:')) {
            secondChanceUnlocked = true;
            const scId = secondRow.reason.slice('quiz:second:'.length);
            const scQ = enabledQuiz.find((q) => q.id === scId);
            if (scQ) {
                secondChanceQuestion = {
                    id: scQ.id,
                    question: scQ.question,
                    options: [scQ.option0, scQ.option1, scQ.option2, scQ.option3],
                };
            }
        }
        if (lastWrong && !alreadyCorrect) {
            lockUntilMs = lastWrong.createdAt.getTime() + lockMs;
            if (Date.now() >= lockUntilMs && !secondChanceUnlocked) {
                secondChanceReady = true;
            }
        }
        const adCooldownMinutes = config.adBonusCooldownMinutes ??
            Math.max(0, config.adBonusCooldownHours) * 60;
        const adCooldownMs = Math.max(0, adCooldownMinutes) * 60 * 1000;
        let nextAdAvailableAtMs = null;
        let adAvailable = !!config.adBonusOptional;
        if (adAvailable && lastAd) {
            const nextAt = lastAd.createdAt.getTime() + adCooldownMs;
            if (Date.now() < nextAt) {
                adAvailable = false;
                nextAdAvailableAtMs = nextAt;
            }
        }
        const claimedMilestoneDays = milestoneRows
            .map((row) => Number.parseInt(row.reason.split(':')[2] ?? '', 10))
            .filter((n) => Number.isFinite(n) && n > 0);
        const activeQuestion = secondChanceQuestion
            ? secondChanceQuestion
            : todayQ
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
                : null;
        return {
            dayKey: day,
            dayOfYear: (0, challenge_shared_1.utcDayOfYear)(),
            streakDays: user.streakDays,
            checkinDone: !!checkinDone,
            adDone: !adAvailable && !!config.adBonusOptional,
            adAvailable,
            nextAdAvailableAtMs,
            claimedMilestoneDays,
            rules: (0, challenge_shared_1.mapRulesForApp)(config),
            question: activeQuestion,
            quizState: {
                alreadyCorrect: !!alreadyCorrect,
                wrongAttempts: wrongCount,
                maxWrongAttempts: 2,
                lockUntilMs,
                openUntilMs: null,
                secondChanceReady,
                secondChanceUnlocked,
            },
            milestones: milestones.map((m) => (0, challenge_shared_1.mapMilestone)(m)),
        };
    }
    async submitQuiz(userId, questionId, selectedIndex) {
        await (0, challenge_shared_1.ensureChallengeDefaults)(this.prisma);
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
        const todayQ = (0, challenge_shared_1.pickTodayQuestion)(enabledQuiz, (0, challenge_shared_1.utcEpochDay)());
        if (!todayQ) {
            throw new app_error_1.AppError('CHALLENGE_NO_QUIZ', 'No quiz available today.', 409);
        }
        const day = (0, economy_catalog_1.utcDateKey)();
        const config = await this.prisma.challengeConfig.findUniqueOrThrow({
            where: { id: challenge_shared_1.CONFIG_ID },
        });
        const lockMs = Math.max(1, config.wrongAnswerLockMinutes ?? 20) *
            60 *
            1000;
        const now = Date.now();
        const alreadyCorrect = await this.prisma.walletLedger.findFirst({
            where: { userId, idempotencyKey: `earn:quiz:ok:${userId}:${day}` },
            select: { id: true },
        });
        if (alreadyCorrect) {
            throw new app_error_1.AppError('CHALLENGE_ALREADY_DONE', 'Quiz already answered correctly today.', 409);
        }
        const secondRow = await this.prisma.walletLedger.findFirst({
            where: { userId, idempotencyKey: `quiz:second:${userId}:${day}` },
            select: { reason: true },
        });
        const secondQid = secondRow?.reason?.startsWith('quiz:second:')
            ? secondRow.reason.slice('quiz:second:'.length)
            : null;
        const activeQ = secondQid
            ? enabledQuiz.find((q) => q.id === secondQid)
            : todayQ;
        if (!activeQ) {
            throw new app_error_1.AppError('CHALLENGE_NO_QUIZ', 'No quiz available today.', 409);
        }
        if (activeQ.id !== qid) {
            throw new app_error_1.AppError('CHALLENGE_WRONG_QUESTION', secondQid
                ? 'That is not your second-chance question.'
                : 'That is not today’s question.', 409);
        }
        const lastWrong = await this.prisma.walletLedger.findFirst({
            where: {
                userId,
                reason: 'earn:quiz:wrong',
                idempotencyKey: { startsWith: `earn:quiz:wrong:${userId}:${day}:` },
            },
            orderBy: { createdAt: 'desc' },
        });
        if (lastWrong && !secondQid) {
            const lockUntil = lastWrong.createdAt.getTime() + lockMs;
            if (now < lockUntil) {
                throw new app_error_1.AppError('CHALLENGE_QUIZ_LOCKED', 'Quiz locked — wait for the countdown.', 409);
            }
            throw new app_error_1.AppError('CHALLENGE_NEED_SECOND_CHANCE', 'Watch a rewarded ad to unlock a new question.', 409);
        }
        const correct = activeQ.correctIndex === selectedIndex;
        const earn = await this.economy.earnQuizGraded(userId, correct, {
            correctCoins: config.quizCorrectCoins,
            wrongCoins: config.quizWrongCoins,
        });
        this.analytics.trackSafe({
            name: 'challenge_quiz_submit',
            userId,
            props: { correct, secondChance: !!secondQid },
        });
        return {
            ...earn,
            correct,
            questionId: activeQ.id,
            selectedIndex,
            lockUntilMs: correct || secondQid ? null : now + lockMs,
            openUntilMs: null,
            secondChanceReady: false,
            wrongAnswerLockMinutes: config.wrongAnswerLockMinutes ?? 20,
        };
    }
    async unlockSecondChance(userId) {
        await (0, challenge_shared_1.ensureChallengeDefaults)(this.prisma);
        await this.economy.requireUserPublic(userId);
        const day = (0, economy_catalog_1.utcDateKey)();
        const config = await this.prisma.challengeConfig.findUniqueOrThrow({
            where: { id: challenge_shared_1.CONFIG_ID },
        });
        const lockMs = Math.max(1, config.wrongAnswerLockMinutes ?? 20) *
            60 *
            1000;
        const alreadyCorrect = await this.prisma.walletLedger.findFirst({
            where: { userId, idempotencyKey: `earn:quiz:ok:${userId}:${day}` },
            select: { id: true },
        });
        if (alreadyCorrect) {
            throw new app_error_1.AppError('CHALLENGE_ALREADY_DONE', 'Quiz already answered correctly today.', 409);
        }
        const existing = await this.prisma.walletLedger.findFirst({
            where: { userId, idempotencyKey: `quiz:second:${userId}:${day}` },
            select: { reason: true },
        });
        const enabledQuiz = await this.prisma.challengeQuizQuestion.findMany({
            where: { enabled: true },
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        });
        const todayQ = (0, challenge_shared_1.pickTodayQuestion)(enabledQuiz, (0, challenge_shared_1.utcEpochDay)());
        if (!todayQ) {
            throw new app_error_1.AppError('CHALLENGE_NO_QUIZ', 'No quiz available today.', 409);
        }
        if (existing?.reason?.startsWith('quiz:second:')) {
            const scId = existing.reason.slice('quiz:second:'.length);
            const scQ = enabledQuiz.find((q) => q.id === scId);
            if (!scQ) {
                throw new app_error_1.AppError('CHALLENGE_NO_QUIZ', 'Second-chance question missing.', 409);
            }
            return {
                alreadyUnlocked: true,
                question: {
                    id: scQ.id,
                    question: scQ.question,
                    options: [scQ.option0, scQ.option1, scQ.option2, scQ.option3],
                },
            };
        }
        const lastWrong = await this.prisma.walletLedger.findFirst({
            where: {
                userId,
                reason: 'earn:quiz:wrong',
                idempotencyKey: { startsWith: `earn:quiz:wrong:${userId}:${day}:` },
            },
            orderBy: { createdAt: 'desc' },
        });
        if (!lastWrong) {
            throw new app_error_1.AppError('CHALLENGE_NO_WRONG', 'Second chance is only for wrong answers.', 409);
        }
        const lockUntil = lastWrong.createdAt.getTime() + lockMs;
        if (Date.now() < lockUntil) {
            throw new app_error_1.AppError('CHALLENGE_QUIZ_LOCKED', 'Wait for the lock countdown, then watch the ad.', 409, { lockUntilMs: lockUntil });
        }
        const nextQ = (0, challenge_shared_1.pickSecondChanceQuestion)(enabledQuiz, todayQ.id, userId, day);
        if (!nextQ) {
            throw new app_error_1.AppError('CHALLENGE_NO_SECOND_Q', 'No alternate question available in the bank.', 409);
        }
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        await this.prisma.walletLedger.create({
            data: {
                userId,
                delta: 0,
                balanceAfter: user.coins,
                reason: `quiz:second:${nextQ.id}`,
                idempotencyKey: `quiz:second:${userId}:${day}`,
            },
        });
        this.analytics.trackSafe({
            name: 'challenge_quiz_second_chance',
            userId,
            props: { questionId: nextQ.id },
        });
        return {
            alreadyUnlocked: false,
            question: {
                id: nextQ.id,
                question: nextQ.question,
                options: [nextQ.option0, nextQ.option1, nextQ.option2, nextQ.option3],
            },
        };
    }
};
exports.ChallengeUserService = ChallengeUserService;
exports.ChallengeUserService = ChallengeUserService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        economy_service_1.EconomyService,
        analytics_service_1.AnalyticsService])
], ChallengeUserService);
//# sourceMappingURL=challenge-user.service.js.map