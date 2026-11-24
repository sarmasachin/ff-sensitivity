"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = exports.CONFIG_ID = void 0;
exports.ensureScratchDefaults = ensureScratchDefaults;
exports.mapPrize = mapPrize;
exports.sanitizeId = sanitizeId;
exports.prizeWriteData = prizeWriteData;
exports.assertOutcomeOdds = assertOutcomeOdds;
exports.assertPrizes = assertPrizes;
exports.auditScratch = auditScratch;
exports.rethrowUnique = rethrowUnique;
const client_1 = require("@prisma/client");
const app_error_1 = require("../common/errors/app-error");
exports.CONFIG_ID = 'default';
exports.DEFAULT_CONFIG = {
    coinsPercent: 55,
    redeemPercent: 45,
    coinAmount: 50,
    retentionDays: 30,
    autoPurge: true,
    showExpired: false,
};
async function ensureScratchDefaults(prisma) {
    await prisma.scratchConfig.upsert({
        where: { id: exports.CONFIG_ID },
        update: {},
        create: { id: exports.CONFIG_ID, ...exports.DEFAULT_CONFIG },
    });
}
function mapPrize(p) {
    return {
        id: p.id,
        title: p.title,
        detail: p.detail,
        kind: p.kind,
        rewardLabel: p.rewardLabel,
        coinReward: p.coinReward,
        oddsPercent: p.oddsPercent,
        enabled: p.enabled,
        streakDays: p.streakDays,
    };
}
function sanitizeId(raw, fallback) {
    const id = (raw?.trim() || fallback)
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 64);
    if (!id || id.includes('/')) {
        throw new app_error_1.AppError('SCRATCH_BAD_ID', 'Invalid prize id.', 400);
    }
    return id;
}
function prizeWriteData(p, sortOrder) {
    return {
        id: sanitizeId(p.id, `prize_${sortOrder + 1}`),
        title: p.title.trim(),
        detail: p.detail.trim(),
        kind: p.kind,
        rewardLabel: p.rewardLabel.trim(),
        coinReward: p.coinReward,
        oddsPercent: p.oddsPercent,
        enabled: p.enabled,
        streakDays: p.streakDays ?? null,
        sortOrder,
    };
}
function assertOutcomeOdds(odds) {
    if (odds.coinsPercent < 0 ||
        odds.redeemPercent < 0 ||
        odds.coinsPercent > 100 ||
        odds.redeemPercent > 100) {
        throw new app_error_1.AppError('SCRATCH_BAD_ODDS', 'Odds must be 0–100.', 400);
    }
    if (odds.coinsPercent + odds.redeemPercent !== 100) {
        throw new app_error_1.AppError('SCRATCH_BAD_ODDS', 'Coins % + Redeem % must total 100.', 400);
    }
    if (odds.coinAmount < 0 || odds.coinAmount > 100_000) {
        throw new app_error_1.AppError('SCRATCH_BAD_AMOUNT', 'Invalid coin amount.', 400);
    }
}
function assertPrizes(prizes) {
    if (prizes.length > 200) {
        throw new app_error_1.AppError('SCRATCH_PRIZE_LIMIT', 'Too many prizes.', 400);
    }
    const ids = new Set();
    for (const p of prizes) {
        const id = sanitizeId(p.id, 'prize');
        if (ids.has(id)) {
            throw new app_error_1.AppError('SCRATCH_DUP_PRIZE', `Duplicate prize id: ${id}`, 400);
        }
        ids.add(id);
        if (p.kind === 'MILESTONE' && (p.streakDays == null || p.streakDays < 1)) {
            throw new app_error_1.AppError('SCRATCH_BAD_MILESTONE', 'Milestone prizes need streak days.', 400);
        }
    }
}
async function auditScratch(prisma, adminId, action, entity, afterJson) {
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
//# sourceMappingURL=scratch-shared.js.map