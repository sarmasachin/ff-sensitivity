"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.communityRolesForWizard = communityRolesForWizard;
exports.communityPullWeight = communityPullWeight;
exports.communityRecencyWeight = communityRecencyWeight;
exports.communityReportShrink = communityReportShrink;
exports.resolveCommunityPull = resolveCommunityPull;
const client_1 = require("@prisma/client");
const compare_promax_family_1 = require("./compare-promax-family");
const ZERO = {
    general: 0,
    redDot: 0,
    scope2x: 0,
    scope4x: 0,
    sniper: 0,
    freeLook: 0,
    fireButton: 0,
};
const MAX_ROWS = 200;
const DAY_MS = 86_400_000;
function communityRolesForWizard(role) {
    const key = String(role ?? '').trim().toLowerCase();
    if (key === 'rusher')
        return ['Rusher'];
    if (key === 'sniper')
        return ['Sniper'];
    if (key === 'flanker')
        return ['Entry', 'Mixed'];
    if (key === 'one-tap headshot' || key === 'one tap headshot') {
        return ['Mixed', 'Support'];
    }
    return [];
}
function communityPullWeight(n) {
    if (n < 2)
        return 0;
    return Math.min(0.32, 0.08 + 0.04 * n);
}
function communityRecencyWeight(createdAt, nowMs = Date.now()) {
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
function communityReportShrink(reports) {
    const r = Number.isFinite(reports) ? Math.max(0, Math.trunc(reports)) : 0;
    if (r <= 0)
        return 1.0;
    if (r === 1)
        return 0.7;
    if (r === 2)
        return 0.45;
    if (r <= 4)
        return 0.25;
    return 0;
}
function avgFromRows(rows, nowMs) {
    if (rows.length === 0)
        return { n: 0, averages: { ...ZERO } };
    let wSum = 0;
    let n = 0;
    let g = 0;
    let rd = 0;
    let s2 = 0;
    let s4 = 0;
    let sn = 0;
    let fl = 0;
    for (const row of rows) {
        const statusW = row.status === client_1.CommunityPostStatus.FEATURED ? 1.5 : 1.0;
        const w = statusW *
            communityRecencyWeight(row.createdAt, nowMs) *
            communityReportShrink(row.reports);
        if (w <= 0)
            continue;
        wSum += w;
        n += 1;
        g += w * row.general;
        rd += w * row.redDot;
        s2 += w * row.scope2x;
        s4 += w * row.scope4x;
        sn += w * row.awm;
        fl += w * row.freeLook;
    }
    if (n <= 0 || wSum <= 0)
        return { n: 0, averages: { ...ZERO } };
    return {
        n,
        averages: {
            general: Math.trunc(g / wSum),
            redDot: Math.trunc(rd / wSum),
            scope2x: Math.trunc(s2 / wSum),
            scope4x: Math.trunc(s4 / wSum),
            sniper: Math.trunc(sn / wSum),
            freeLook: Math.trunc(fl / wSum),
            fireButton: 0,
        },
    };
}
async function resolveCommunityPull(prisma, opts) {
    const roles = communityRolesForWizard(opts.role ?? '');
    if (roles.length === 0) {
        return { n: 0, weight: 0, source: 'none', averages: { ...ZERO } };
    }
    const where = {
        status: {
            in: [client_1.CommunityPostStatus.APPROVED, client_1.CommunityPostStatus.FEATURED],
        },
        role: { in: roles },
    };
    if (opts.excludeUserId) {
        where.userId = { not: opts.excludeUserId };
    }
    const rows = await prisma.communityPost.findMany({
        where,
        select: {
            userId: true,
            deviceLabel: true,
            role: true,
            status: true,
            reports: true,
            createdAt: true,
            general: true,
            redDot: true,
            scope2x: true,
            scope4x: true,
            awm: true,
            freeLook: true,
        },
        orderBy: { createdAt: 'desc' },
        take: MAX_ROWS,
    });
    const family = (0, compare_promax_family_1.deviceFamilyKey)(opts.deviceLabel ?? '');
    const familyRows = family.length > 0
        ? rows.filter((r) => (0, compare_promax_family_1.deviceFamilyKey)(r.deviceLabel) === family)
        : [];
    const useFamily = familyRows.length >= 2;
    const picked = useFamily ? familyRows : rows;
    const nowMs = Date.now();
    const scored = avgFromRows(picked, nowMs);
    const weight = communityPullWeight(scored.n);
    if (weight <= 0) {
        return { n: scored.n, weight: 0, source: 'none', averages: { ...ZERO } };
    }
    return {
        n: scored.n,
        weight,
        source: useFamily ? 'family' : 'role',
        averages: scored.averages,
    };
}
//# sourceMappingURL=compare-promax-community.js.map