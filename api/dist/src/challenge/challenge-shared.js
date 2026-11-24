"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_RULES = exports.CONFIG_ID = void 0;
exports.ensureChallengeDefaults = ensureChallengeDefaults;
exports.mapRules = mapRules;
exports.mapRulesForApp = mapRulesForApp;
exports.resolveAdBonusCooldownMinutes = resolveAdBonusCooldownMinutes;
exports.mapQuizAdmin = mapQuizAdmin;
exports.mapMilestone = mapMilestone;
exports.sanitizeId = sanitizeId;
exports.assertQuizList = assertQuizList;
exports.assertMilestoneList = assertMilestoneList;
exports.auditChallenge = auditChallenge;
exports.rethrowUnique = rethrowUnique;
exports.pickTodayQuestion = pickTodayQuestion;
exports.pickSecondChanceQuestion = pickSecondChanceQuestion;
exports.utcDayOfYear = utcDayOfYear;
exports.utcEpochDay = utcEpochDay;
const client_1 = require("@prisma/client");
const app_error_1 = require("../common/errors/app-error");
exports.CONFIG_ID = 'default';
exports.DEFAULT_RULES = {
    missDayResetsStreak: true,
    requireCheckIn: true,
    requireQuiz: true,
    adBonusOptional: true,
    adBonusCooldownHours: 4,
    adBonusCooldownMinutes: 240,
    scratchCardsPerDay: 1,
    cardExpiresSameDay: true,
    firstMilestoneDays: 7,
    wrongAnswerLockHours: 4,
    wrongAnswerLockMinutes: 20,
    quizOpenWindowHours: 2,
    quizCorrectCoins: 50,
    quizWrongCoins: -10,
    checkinCoins: 20,
    adBonusCoins: 30,
    premiumUnlockBestCoins: 100,
    premiumUnlockProMaxCoins: 200,
    premiumUnlockOneTapCoins: 150,
};
async function ensureChallengeDefaults(prisma) {
    await prisma.challengeConfig.upsert({
        where: { id: exports.CONFIG_ID },
        update: {},
        create: { id: exports.CONFIG_ID, ...exports.DEFAULT_RULES },
    });
}
function mapRules(c) {
    const minutes = c.adBonusCooldownMinutes ??
        Math.max(0, Math.trunc(c.adBonusCooldownHours) * 60);
    const hours = minutes <= 0 ? 0 : Math.min(168, Math.max(1, Math.ceil(minutes / 60)));
    return {
        missDayResetsStreak: c.missDayResetsStreak,
        requireCheckIn: c.requireCheckIn,
        requireQuiz: c.requireQuiz,
        adBonusOptional: c.adBonusOptional,
        adBonusCooldownHours: hours,
        adBonusCooldownMinutes: minutes,
        scratchCardsPerDay: c.scratchCardsPerDay,
        cardExpiresSameDay: c.cardExpiresSameDay,
        firstMilestoneDays: c.firstMilestoneDays,
        wrongAnswerLockHours: c.wrongAnswerLockHours,
        wrongAnswerLockMinutes: c.wrongAnswerLockMinutes ?? 20,
        quizOpenWindowHours: c.quizOpenWindowHours,
        quizCorrectCoins: c.quizCorrectCoins,
        quizWrongCoins: c.quizWrongCoins,
    };
}
function mapRulesForApp(c) {
    return {
        ...mapRules(c),
        checkinCoins: c.checkinCoins,
        adBonusCoins: c.adBonusCoins,
        checkInEnabled: c.checkInEnabled,
        quizEnabled: c.quizEnabled,
        walletCap: c.walletCap,
        dailyEarnCap: c.dailyEarnCap,
    };
}
function resolveAdBonusCooldownMinutes(rules) {
    if (rules.adBonusCooldownMinutes !== undefined &&
        rules.adBonusCooldownMinutes !== null &&
        Number.isFinite(rules.adBonusCooldownMinutes)) {
        return Math.min(168 * 60, Math.max(0, Math.trunc(rules.adBonusCooldownMinutes)));
    }
    return Math.min(168 * 60, Math.max(0, Math.trunc(rules.adBonusCooldownHours) * 60));
}
function mapQuizAdmin(q) {
    return {
        id: q.id,
        question: q.question,
        options: [q.option0, q.option1, q.option2, q.option3],
        correctIndex: q.correctIndex,
        enabled: q.enabled,
    };
}
function mapMilestone(m) {
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
function sanitizeId(raw, fallback) {
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
function assertQuizList(quiz) {
    if (quiz.length > 1500) {
        throw new app_error_1.AppError('CHALLENGE_QUIZ_LIMIT', 'Too many questions (max 1500).', 400);
    }
    const ids = new Set();
    for (const q of quiz) {
        if (!Array.isArray(q.options) || q.options.length !== 4) {
            throw new app_error_1.AppError('CHALLENGE_BAD_OPTIONS', 'Each quiz needs 4 options.', 400);
        }
        if (q.options.some((o) => !o?.trim())) {
            throw new app_error_1.AppError('CHALLENGE_BAD_OPTIONS', 'Options cannot be blank.', 400);
        }
        const id = sanitizeId(q.id, 'q');
        if (ids.has(id)) {
            throw new app_error_1.AppError('CHALLENGE_DUP_QUIZ', `Duplicate quiz id: ${id}`, 400);
        }
        ids.add(id);
    }
}
function assertMilestoneList(milestones) {
    if (milestones.length > 100) {
        throw new app_error_1.AppError('CHALLENGE_MS_LIMIT', 'Too many milestones.', 400);
    }
    const ids = new Set();
    const days = new Set();
    for (const m of milestones) {
        const id = sanitizeId(m.id, `m${m.days}`);
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
async function auditChallenge(prisma, adminId, action, entity, afterJson) {
    await prisma.auditLog.create({
        data: { actorAdminId: adminId, action, entity, afterJson },
    });
}
function rethrowUnique(err, code, message) {
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002') {
        throw new app_error_1.AppError(code, message, 409);
    }
    throw err;
}
function pickTodayQuestion(rows, dayIndex) {
    if (!rows.length)
        return null;
    const index = ((dayIndex % rows.length) + rows.length) % rows.length;
    return rows[index] ?? null;
}
function pickSecondChanceQuestion(rows, todayId, userId, day) {
    const pool = rows.filter((r) => r.id !== todayId);
    if (!pool.length)
        return null;
    let hash = 0;
    const seed = `${userId}:${day}`;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    return pool[hash % pool.length] ?? null;
}
function utcDayOfYear(d = new Date()) {
    const start = Date.UTC(d.getUTCFullYear(), 0, 0);
    const now = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    return Math.floor((now - start) / 86_400_000);
}
function utcEpochDay(d = new Date()) {
    return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86_400_000);
}
//# sourceMappingURL=challenge-shared.js.map