"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REDEEM_SCRATCH_SAFE_TIP = void 0;
exports.assertScratchAttemptKey = assertScratchAttemptKey;
exports.scratchWindowIndex = scratchWindowIndex;
exports.rollScratchCoins = rollScratchCoins;
const app_error_1 = require("../common/errors/app-error");
exports.REDEEM_SCRATCH_SAFE_TIP = 'Scratch to earn Coins. Limited reward codes distributed via schedule.';
function assertScratchAttemptKey(raw) {
    const key = raw?.trim() ?? '';
    if (key.length < 8 || key.length > 64 || !/^[a-zA-Z0-9_-]+$/.test(key)) {
        throw new app_error_1.AppError('REDEEM_BAD_ATTEMPT', 'Invalid scratch attempt key.', 400);
    }
    return key;
}
function scratchWindowIndex(startsAt, windowMinutes, now) {
    const mins = Math.max(1, windowMinutes);
    const elapsed = now.getTime() - startsAt.getTime();
    if (elapsed < 0)
        return -1;
    return Math.floor(elapsed / (mins * 60_000));
}
function rollScratchCoins(min, max) {
    const lo = Math.max(0, Math.min(min, max));
    const hi = Math.max(lo, Math.max(min, max));
    if (hi === lo)
        return lo;
    return lo + Math.floor(Math.random() * (hi - lo + 1));
}
//# sourceMappingURL=redeem-scratch-math.js.map