"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fieldAgreementScale = fieldAgreementScale;
exports.thinSampleFieldScale = thinSampleFieldScale;
exports.weightedMad = weightedMad;
function fieldAgreementScale(mad) {
    if (!Number.isFinite(mad) || mad < 0)
        return 1;
    if (mad <= 4)
        return 1.0;
    if (mad <= 8)
        return 0.75;
    if (mad <= 14)
        return 0.5;
    return 0.3;
}
function thinSampleFieldScale(field, n) {
    if (n >= 5)
        return 1;
    if (field === 'fireButton' || field === 'sniper')
        return 0.85;
    return 1;
}
function weightedMad(pairs, mean) {
    let wSum = 0;
    let acc = 0;
    for (const p of pairs) {
        if (p.w <= 0)
            continue;
        wSum += p.w;
        acc += p.w * Math.abs(p.v - mean);
    }
    if (wSum <= 0)
        return 0;
    return acc / wSum;
}
//# sourceMappingURL=compare-promax-field-confidence.js.map