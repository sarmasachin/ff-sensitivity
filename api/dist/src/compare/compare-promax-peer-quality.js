"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.feedbackWeight = feedbackWeight;
exports.dedupePeersByUser = dedupePeersByUser;
exports.feedbackSignConsistent = feedbackSignConsistent;
exports.recencyWeight = recencyWeight;
exports.isOutlierPeer = isOutlierPeer;
exports.confidenceScale = confidenceScale;
exports.computeWeightedOffsets = computeWeightedOffsets;
const compare_promax_field_confidence_1 = require("./compare-promax-field-confidence");
const ZERO = {
    general: 0,
    redDot: 0,
    scope2x: 0,
    scope4x: 0,
    sniper: 0,
    freeLook: 0,
    fireButton: 0,
};
const AGREE_ONE = {
    general: 1,
    redDot: 1,
    scope2x: 1,
    scope4x: 1,
    sniper: 1,
    freeLook: 1,
    fireButton: 1,
};
const OUTLIER_GEN = 28;
const OUTLIER_FIRE = 15;
const DAY_MS = 86_400_000;
const SIGN_EPS = 2;
function feedbackWeight(feedback) {
    if (feedback === 'perfect')
        return 1.0;
    if (feedback === 'too_fast' || feedback === 'too_slow')
        return 0.45;
    return 0.2;
}
function feedbackQuality(feedback) {
    if (feedback === 'perfect')
        return 3;
    if (feedback === 'too_fast' || feedback === 'too_slow')
        return 2;
    return 1;
}
function isBetterPeerRow(candidate, current) {
    const cq = feedbackQuality(candidate.feedback);
    const uq = feedbackQuality(current.feedback);
    if (cq !== uq)
        return cq > uq;
    const ct = candidate.createdAt?.getTime?.() ?? 0;
    const ut = current.createdAt?.getTime?.() ?? 0;
    return ct > ut;
}
function dedupePeersByUser(rows) {
    const best = new Map();
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const uid = String(row.userId ?? '').trim() || `__anon_${i}`;
        const prev = best.get(uid);
        if (!prev || isBetterPeerRow(row, prev)) {
            best.set(uid, row);
        }
    }
    return Array.from(best.values());
}
function feedbackSignConsistent(row) {
    if (row.feedback === 'perfect')
        return true;
    if (row.feedback !== 'too_fast' && row.feedback !== 'too_slow')
        return true;
    if (!Number.isFinite(row.general) || Math.abs(row.general) < SIGN_EPS) {
        return true;
    }
    if (row.feedback === 'too_fast')
        return row.general < 0;
    return row.general > 0;
}
function recencyWeight(createdAt, nowMs) {
    const ageDays = Math.max(0, (nowMs - createdAt.getTime()) / DAY_MS);
    if (ageDays <= 14)
        return 1.0;
    if (ageDays <= 45)
        return 0.8;
    if (ageDays <= 90)
        return 0.55;
    if (ageDays <= 180)
        return 0.35;
    return 0.22;
}
function isOutlierPeer(row) {
    if (Math.abs(row.general) > OUTLIER_GEN)
        return true;
    if (Math.abs(row.redDot) > OUTLIER_GEN)
        return true;
    if (Math.abs(row.scope2x) > OUTLIER_GEN)
        return true;
    if (Math.abs(row.scope4x) > OUTLIER_GEN)
        return true;
    if (Math.abs(row.sniper) > OUTLIER_GEN)
        return true;
    if (Math.abs(row.freeLook) > OUTLIER_GEN)
        return true;
    if (Math.abs(row.fireButton) > OUTLIER_FIRE)
        return true;
    return false;
}
function confidenceScale(n) {
    if (n >= 8)
        return 1.0;
    if (n >= 5)
        return 0.75;
    if (n >= 3)
        return 0.55;
    if (n >= 2)
        return 0.4;
    if (n >= 1)
        return 0.28;
    return 0;
}
function fieldMean(pairs, wSum) {
    if (wSum <= 0)
        return 0;
    let acc = 0;
    for (const p of pairs)
        acc += p.w * p.v;
    return acc / wSum;
}
function agreeFor(pairs, wSum) {
    if (wSum <= 0 || pairs.length === 0)
        return 1;
    const mean = fieldMean(pairs, wSum);
    return (0, compare_promax_field_confidence_1.fieldAgreementScale)((0, compare_promax_field_confidence_1.weightedMad)(pairs, mean));
}
function finalizeField(pairs, wSum, n, sampleConf, field, agree) {
    const mean = fieldMean(pairs, wSum);
    const thin = (0, compare_promax_field_confidence_1.thinSampleFieldScale)(field, n);
    return Math.trunc(mean * sampleConf * agree * thin);
}
function computeWeightedOffsets(rows, nowMs = Date.now()) {
    const unique = dedupePeersByUser(rows);
    const gPairs = [];
    const rdPairs = [];
    const s2Pairs = [];
    const s4Pairs = [];
    const snPairs = [];
    const flPairs = [];
    const fbPairs = [];
    let wSum = 0;
    let n = 0;
    for (const row of unique) {
        if (isOutlierPeer(row))
            continue;
        if (!feedbackSignConsistent(row))
            continue;
        const w = feedbackWeight(row.feedback) * recencyWeight(row.createdAt, nowMs);
        if (w <= 0)
            continue;
        wSum += w;
        gPairs.push({ w, v: row.general });
        rdPairs.push({ w, v: row.redDot });
        s2Pairs.push({ w, v: row.scope2x });
        s4Pairs.push({ w, v: row.scope4x });
        snPairs.push({ w, v: row.sniper });
        flPairs.push({ w, v: row.freeLook });
        fbPairs.push({ w, v: row.fireButton });
        n += 1;
    }
    if (n <= 0 || wSum <= 0) {
        return {
            n: 0,
            offsets: { ...ZERO },
            confidence: 0,
            fieldAgreement: { ...AGREE_ONE },
        };
    }
    const confidence = confidenceScale(n);
    const fieldAgreement = {
        general: agreeFor(gPairs, wSum),
        redDot: agreeFor(rdPairs, wSum),
        scope2x: agreeFor(s2Pairs, wSum),
        scope4x: agreeFor(s4Pairs, wSum),
        sniper: agreeFor(snPairs, wSum),
        freeLook: agreeFor(flPairs, wSum),
        fireButton: agreeFor(fbPairs, wSum),
    };
    return {
        n,
        confidence,
        fieldAgreement,
        offsets: {
            general: finalizeField(gPairs, wSum, n, confidence, 'general', fieldAgreement.general),
            redDot: finalizeField(rdPairs, wSum, n, confidence, 'redDot', fieldAgreement.redDot),
            scope2x: finalizeField(s2Pairs, wSum, n, confidence, 'scope2x', fieldAgreement.scope2x),
            scope4x: finalizeField(s4Pairs, wSum, n, confidence, 'scope4x', fieldAgreement.scope4x),
            sniper: finalizeField(snPairs, wSum, n, confidence, 'sniper', fieldAgreement.sniper),
            freeLook: finalizeField(flPairs, wSum, n, confidence, 'freeLook', fieldAgreement.freeLook),
            fireButton: finalizeField(fbPairs, wSum, n, confidence, 'fireButton', fieldAgreement.fireButton),
        },
    };
}
//# sourceMappingURL=compare-promax-peer-quality.js.map