"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadEconomyRates = loadEconomyRates;
exports.settleCoinDelta = settleCoinDelta;
const app_error_1 = require("../common/errors/app-error");
const challenge_shared_1 = require("../challenge/challenge-shared");
function clampCap(n) {
    if (!Number.isFinite(n))
        return 9_999_999;
    return Math.max(100, Math.min(9_999_999, Math.floor(n)));
}
async function loadEconomyRates(db) {
    const row = await db.challengeConfig.findUnique({ where: { id: challenge_shared_1.CONFIG_ID } });
    return {
        checkinCoins: row?.checkinCoins ?? 20,
        checkinBoostExtra: 20,
        quizCorrectCoins: row?.quizCorrectCoins ?? 50,
        quizWrongCoins: row?.quizWrongCoins ?? -10,
        adBonusCoins: Math.max(0, row?.adBonusCoins ?? 30),
        walletCap: clampCap(row?.walletCap ?? 9_999_999),
        dailyEarnCap: Math.max(0, row?.dailyEarnCap ?? 0),
        checkInEnabled: row?.checkInEnabled ?? true,
        quizEnabled: row?.quizEnabled ?? true,
        adBonusEnabled: row?.adBonusOptional ?? true,
        adBonusCooldownHours: Math.max(0, row?.adBonusCooldownHours ?? 4),
        adBonusCooldownMinutes: Math.max(0, row?.adBonusCooldownMinutes ??
            Math.max(0, row?.adBonusCooldownHours ?? 4) * 60),
    };
}
function utcDayStart(now = new Date()) {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
async function settleCoinDelta(tx, userId, current, delta) {
    const rates = await loadEconomyRates(tx);
    let nextDelta = delta;
    if (nextDelta > 0 && rates.dailyEarnCap > 0) {
        const earned = await tx.walletLedger.aggregate({
            where: {
                userId,
                delta: { gt: 0 },
                reason: { startsWith: 'earn:' },
                createdAt: { gte: utcDayStart() },
            },
            _sum: { delta: true },
        });
        const room = rates.dailyEarnCap - (earned._sum.delta ?? 0);
        if (room <= 0) {
            throw new app_error_1.AppError('ECONOMY_DAILY_CAP', 'Daily earn cap reached.', 409);
        }
        nextDelta = Math.min(nextDelta, room);
    }
    let nextCoins = current + nextDelta;
    if (nextDelta > 0) {
        nextCoins =
            current >= rates.walletCap ? current : Math.min(rates.walletCap, nextCoins);
    }
    else {
        nextCoins = Math.max(0, nextCoins);
    }
    return { nextCoins, applied: nextCoins - current };
}
//# sourceMappingURL=economy-rates.js.map