"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMPARE_ENGINE_PROMAX = exports.COMPARE_ENGINE_ONE_TAP = void 0;
exports.mapPeer = mapPeer;
exports.loadPeers = loadPeers;
exports.excludeSelf = excludeSelf;
exports.peerEngineWhere = peerEngineWhere;
exports.withPeerEngine = withPeerEngine;
exports.normalizeCompareEngine = normalizeCompareEngine;
const MAX_ROWS = 400;
const PEER_SELECT = {
    userId: true,
    deviceLabel: true,
    feedback: true,
    createdAt: true,
    actualGeneral: true,
    suggestedGeneral: true,
    actualRedDot: true,
    suggestedRedDot: true,
    actualScope2x: true,
    suggestedScope2x: true,
    actualScope4x: true,
    suggestedScope4x: true,
    actualSniper: true,
    suggestedSniper: true,
    actualFreeLook: true,
    suggestedFreeLook: true,
    actualFireButton: true,
    suggestedFireButton: true,
};
function mapPeer(row) {
    return {
        userId: row.userId,
        deviceLabel: row.deviceLabel,
        feedback: row.feedback,
        createdAt: row.createdAt,
        general: row.actualGeneral - row.suggestedGeneral,
        redDot: row.actualRedDot - row.suggestedRedDot,
        scope2x: row.actualScope2x - row.suggestedScope2x,
        scope4x: row.actualScope4x - row.suggestedScope4x,
        sniper: row.actualSniper - row.suggestedSniper,
        freeLook: row.actualFreeLook - row.suggestedFreeLook,
        fireButton: row.actualFireButton - row.suggestedFireButton,
    };
}
async function loadPeers(prisma, where) {
    const rows = await prisma.sensitivityCompare.findMany({
        where,
        select: PEER_SELECT,
        orderBy: { createdAt: 'desc' },
        take: MAX_ROWS,
    });
    return rows.map(mapPeer);
}
function excludeSelf(base, excludeUserId) {
    if (!excludeUserId)
        return base;
    return { ...base, userId: { not: excludeUserId } };
}
exports.COMPARE_ENGINE_ONE_TAP = 'one_tap';
exports.COMPARE_ENGINE_PROMAX = 'promax';
function peerEngineWhere(engineRaw) {
    const e = (engineRaw ?? '').trim().toLowerCase();
    if (e === exports.COMPARE_ENGINE_ONE_TAP || e === 'one_tap_premium') {
        return { engine: exports.COMPARE_ENGINE_ONE_TAP };
    }
    return {
        OR: [{ engine: null }, { engine: exports.COMPARE_ENGINE_PROMAX }],
    };
}
function withPeerEngine(base, engineRaw, excludeUserId) {
    return excludeSelf({ ...base, ...peerEngineWhere(engineRaw) }, excludeUserId);
}
function normalizeCompareEngine(raw) {
    const e = (raw ?? '').trim().toLowerCase();
    if (!e)
        return null;
    if (e === exports.COMPARE_ENGINE_ONE_TAP || e === 'one_tap_premium') {
        return exports.COMPARE_ENGINE_ONE_TAP;
    }
    if (e === exports.COMPARE_ENGINE_PROMAX ||
        e === 'premium_pro_max' ||
        e === 'premium_sensi_pro_max') {
        return exports.COMPARE_ENGINE_PROMAX;
    }
    if (e === 'best_premium')
        return 'best_premium';
    if (e === 'classic')
        return 'classic';
    return null;
}
//# sourceMappingURL=compare-promax-peer-load.js.map