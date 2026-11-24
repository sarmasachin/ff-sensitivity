"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PROMAX_CONFIG = void 0;
exports.normalizeProMaxConfig = normalizeProMaxConfig;
exports.assertProMaxConfigForSave = assertProMaxConfigForSave;
const app_error_1 = require("../common/errors/app-error");
exports.DEFAULT_PROMAX_CONFIG = {
    shareConflict: {
        softGap: 8,
        hardGap: 35,
        maxShrink: 0.75,
    },
};
function asRecord(raw) {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        return raw;
    }
    return {};
}
function clampNum(raw, fallback, min, max) {
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(n))
        return fallback;
    return Math.min(max, Math.max(min, n));
}
function normalizeProMaxConfig(raw) {
    const root = asRecord(raw);
    const sc = asRecord(root.shareConflict);
    const d = exports.DEFAULT_PROMAX_CONFIG.shareConflict;
    let softGap = clampNum(sc.softGap, d.softGap, 0, 50);
    let hardGap = clampNum(sc.hardGap, d.hardGap, 1, 100);
    if (hardGap <= softGap)
        hardGap = Math.min(100, softGap + 1);
    const maxShrink = clampNum(sc.maxShrink, d.maxShrink, 0, 0.95);
    return {
        shareConflict: { softGap, hardGap, maxShrink },
    };
}
function assertProMaxConfigForSave(raw) {
    const normalized = normalizeProMaxConfig(raw);
    const { softGap, hardGap, maxShrink } = normalized.shareConflict;
    if (hardGap <= softGap) {
        throw new app_error_1.AppError('PROMAX_BAD_GAPS', 'Hard gap must be greater than soft gap.', 400);
    }
    if (maxShrink < 0 || maxShrink > 0.95) {
        throw new app_error_1.AppError('PROMAX_BAD_SHRINK', 'Max shrink must be between 0 and 0.95.', 400);
    }
    return normalized;
}
//# sourceMappingURL=app-config-promax.js.map