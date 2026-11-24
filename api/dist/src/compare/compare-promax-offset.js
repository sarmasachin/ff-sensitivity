"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.feedbackSignConsistent = exports.dedupePeersByUser = exports.confidenceScale = exports.computeWeightedOffsets = exports.deviceFamilyKey = void 0;
exports.ramBucket = ramBucket;
exports.refreshBucket = refreshBucket;
exports.cleanFilter = cleanFilter;
exports.blendScored = blendScored;
exports.resolveProMaxOffsets = resolveProMaxOffsets;
const compare_promax_family_1 = require("./compare-promax-family");
const compare_promax_community_1 = require("./compare-promax-community");
const compare_promax_peer_quality_1 = require("./compare-promax-peer-quality");
const compare_promax_tiers_1 = require("./compare-promax-tiers");
const AGREE_ONE = {
    general: 1,
    redDot: 1,
    scope2x: 1,
    scope4x: 1,
    sniper: 1,
    freeLook: 1,
    fireButton: 1,
};
const ZERO = {
    general: 0,
    redDot: 0,
    scope2x: 0,
    scope4x: 0,
    sniper: 0,
    freeLook: 0,
    fireButton: 0,
};
const BLEND_BELOW_N = 5;
var compare_promax_family_2 = require("./compare-promax-family");
Object.defineProperty(exports, "deviceFamilyKey", { enumerable: true, get: function () { return compare_promax_family_2.deviceFamilyKey; } });
var compare_promax_peer_quality_2 = require("./compare-promax-peer-quality");
Object.defineProperty(exports, "computeWeightedOffsets", { enumerable: true, get: function () { return compare_promax_peer_quality_2.computeWeightedOffsets; } });
Object.defineProperty(exports, "confidenceScale", { enumerable: true, get: function () { return compare_promax_peer_quality_2.confidenceScale; } });
Object.defineProperty(exports, "dedupePeersByUser", { enumerable: true, get: function () { return compare_promax_peer_quality_2.dedupePeersByUser; } });
Object.defineProperty(exports, "feedbackSignConsistent", { enumerable: true, get: function () { return compare_promax_peer_quality_2.feedbackSignConsistent; } });
function ramBucket(ramGb) {
    if (!Number.isFinite(ramGb) || ramGb <= 0)
        return 0;
    if (ramGb <= 2)
        return 2;
    if (ramGb <= 3)
        return 3;
    if (ramGb <= 4)
        return 4;
    if (ramGb < 8)
        return 6;
    if (ramGb < 12)
        return 8;
    return 12;
}
function refreshBucket(hz) {
    if (!Number.isFinite(hz) || hz <= 0)
        return 0;
    if (hz <= 60)
        return 60;
    if (hz <= 90)
        return 90;
    if (hz <= 120)
        return 120;
    return 144;
}
function cleanFilter(raw, maxLen = 40) {
    const value = String(raw ?? '').trim();
    if (!value || value.length > maxLen)
        return '';
    return value;
}
function blendScored(primary, secondary) {
    const pw = Math.min(0.85, 0.45 + 0.1 * primary.n);
    const sw = 1 - pw;
    const mix = (a, b) => Math.trunc(a * pw + b * sw);
    const mixA = (a, b) => Math.round((a * pw + b * sw) * 100) / 100;
    return {
        offsetFrom: `${primary.name}_blend`,
        matchCount: primary.n + secondary.n,
        confidence: Math.min(1, Math.round((primary.confidence * pw + secondary.confidence * sw) * 100) / 100),
        blendFrom: secondary.name,
        fieldAgreement: {
            general: mixA(primary.fieldAgreement.general, secondary.fieldAgreement.general),
            redDot: mixA(primary.fieldAgreement.redDot, secondary.fieldAgreement.redDot),
            scope2x: mixA(primary.fieldAgreement.scope2x, secondary.fieldAgreement.scope2x),
            scope4x: mixA(primary.fieldAgreement.scope4x, secondary.fieldAgreement.scope4x),
            sniper: mixA(primary.fieldAgreement.sniper, secondary.fieldAgreement.sniper),
            freeLook: mixA(primary.fieldAgreement.freeLook, secondary.fieldAgreement.freeLook),
            fireButton: mixA(primary.fieldAgreement.fireButton, secondary.fieldAgreement.fireButton),
        },
        averageOffsets: {
            general: mix(primary.offsets.general, secondary.offsets.general),
            redDot: mix(primary.offsets.redDot, secondary.offsets.redDot),
            scope2x: mix(primary.offsets.scope2x, secondary.offsets.scope2x),
            scope4x: mix(primary.offsets.scope4x, secondary.offsets.scope4x),
            sniper: mix(primary.offsets.sniper, secondary.offsets.sniper),
            freeLook: mix(primary.offsets.freeLook, secondary.offsets.freeLook),
            fireButton: mix(primary.offsets.fireButton, secondary.offsets.fireButton),
        },
    };
}
function toResult(scored) {
    return {
        offsetFrom: scored.name,
        matchCount: scored.n,
        confidence: scored.confidence,
        averageOffsets: scored.offsets,
        fieldAgreement: scored.fieldAgreement,
    };
}
async function resolveProMaxOffsets(prisma, query) {
    const fingers = cleanFilter(query.fingers);
    const role = cleanFilter(query.role);
    const deviceLabel = cleanFilter(query.deviceLabel, 80);
    const family = (0, compare_promax_family_1.deviceFamilyKey)(deviceLabel);
    const processorBrand = cleanFilter(query.processorBrand);
    const processorType = cleanFilter(query.processorType, 80);
    const gpuLabel = cleanFilter(query.gpuLabel, 80);
    const gpuVendor = cleanFilter(query.gpuVendor);
    const dpiPreference = cleanFilter(query.dpiPreference);
    const screenGuard = cleanFilter(query.screenGuard);
    const excludeUserId = cleanFilter(query.excludeUserId, 64);
    const ramGbNum = Number(query.ramGb);
    const bucket = Number.isFinite(ramGbNum) && ramGbNum > 0 ? ramBucket(ramGbNum) : 0;
    const refreshHzNum = Number(query.refreshHz);
    const hzBucket = Number.isFinite(refreshHzNum) && refreshHzNum > 0
        ? refreshBucket(refreshHzNum)
        : 0;
    const nowMs = Date.now();
    const ex = excludeUserId || undefined;
    const tiers = (0, compare_promax_tiers_1.buildProMaxTiers)({
        prisma,
        fingers,
        role,
        deviceLabel,
        family,
        processorBrand,
        processorType,
        gpuLabel,
        gpuVendor,
        dpiPreference,
        screenGuard,
        bucket,
        hzBucket,
        ex,
        engine: query.engine,
    });
    const scoreTier = async (tier) => {
        const peers = await tier.load();
        const scored = (0, compare_promax_peer_quality_1.computeWeightedOffsets)(peers, nowMs);
        if (scored.n < tier.minN)
            return null;
        return {
            name: tier.name,
            n: scored.n,
            offsets: scored.offsets,
            confidence: scored.confidence,
            fieldAgreement: scored.fieldAgreement,
        };
    };
    const community = await (0, compare_promax_community_1.resolveCommunityPull)(prisma, {
        role,
        deviceLabel,
        excludeUserId: ex,
    });
    const withCommunity = (result) => ({
        ...result,
        community,
    });
    for (let i = 0; i < tiers.length; i++) {
        const primary = await scoreTier(tiers[i]);
        if (!primary)
            continue;
        if (primary.n >= BLEND_BELOW_N || i >= tiers.length - 1) {
            return withCommunity(toResult(primary));
        }
        const secondary = await scoreTier(tiers[i + 1]);
        if (secondary && secondary.n >= 1) {
            return withCommunity(blendScored(primary, secondary));
        }
        return withCommunity(toResult(primary));
    }
    return withCommunity({
        offsetFrom: 'none',
        matchCount: 0,
        confidence: 0,
        averageOffsets: { ...ZERO },
        fieldAgreement: { ...AGREE_ONE },
    });
}
//# sourceMappingURL=compare-promax-offset.js.map