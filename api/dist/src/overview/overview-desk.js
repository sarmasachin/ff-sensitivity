"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDeskRange = parseDeskRange;
exports.buildOverviewDesk = buildOverviewDesk;
const client_1 = require("@prisma/client");
const audit_security_1 = require("../audit/audit-security");
const overview_security_1 = require("./overview-security");
const overview_series_1 = require("./overview-series");
const SUBJECT_LABEL = {
    REPORT: 'Report',
    REDEEM_CODE_ISSUE: 'Redeem code issue',
    BUG: 'Bug',
    FEATURE: 'Feature',
    FEEDBACK: 'Feedback',
    OTHER: 'Other',
};
function parseDeskRange(raw) {
    if (raw === 'today' || raw === '30d')
        return raw;
    return '7d';
}
function sinceFor(range, now) {
    if (range === 'today')
        return (0, overview_security_1.startOfUtcDay)(now);
    const keys = (0, overview_series_1.utcDayKeys)(range === '30d' ? 30 : 7, now);
    return new Date(`${keys[0]}T00:00:00.000Z`);
}
function num(value) {
    return Number(value ?? 0);
}
function ageLabel(from, now) {
    const mins = Math.floor(Math.max(0, now.getTime() - from.getTime()) / 60_000);
    if (mins < 60)
        return `${Math.max(1, mins)}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 48)
        return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
}
async function claimsByDay(prisma, since) {
    return prisma.$queryRaw `
    SELECT TO_CHAR((created_at AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS day,
           COUNT(*)::bigint AS c
    FROM redeem_claims
    WHERE created_at >= ${since}
    GROUP BY 1
  `;
}
async function scratchByDay(prisma, since) {
    return prisma.$queryRaw `
    SELECT TO_CHAR((created_at AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS day,
           COUNT(*)::bigint AS c
    FROM redeem_scratch_rolls
    WHERE created_at >= ${since}
    GROUP BY 1
  `;
}
async function claimsByHour(prisma, since) {
    return prisma.$queryRaw `
    SELECT EXTRACT(HOUR FROM (created_at AT TIME ZONE 'UTC'))::int AS hour,
           COUNT(*)::bigint AS c
    FROM redeem_claims
    WHERE created_at >= ${since}
    GROUP BY 1
  `;
}
async function scratchByHour(prisma, since) {
    return prisma.$queryRaw `
    SELECT EXTRACT(HOUR FROM (created_at AT TIME ZONE 'UTC'))::int AS hour,
           COUNT(*)::bigint AS c
    FROM redeem_scratch_rolls
    WHERE created_at >= ${since}
    GROUP BY 1
  `;
}
async function flowByDay(prisma, since) {
    return prisma.$queryRaw `
    SELECT TO_CHAR((created_at AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS day,
           COALESCE(SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END), 0)::bigint AS grant,
           COALESCE(SUM(CASE WHEN delta < 0 THEN -delta ELSE 0 END), 0)::bigint AS revoke
    FROM wallet_ledger
    WHERE created_at >= ${since}
    GROUP BY 1
  `;
}
async function flowByHour(prisma, since) {
    return prisma.$queryRaw `
    SELECT EXTRACT(HOUR FROM (created_at AT TIME ZONE 'UTC'))::int AS hour,
           COALESCE(SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END), 0)::bigint AS grant,
           COALESCE(SUM(CASE WHEN delta < 0 THEN -delta ELSE 0 END), 0)::bigint AS revoke
    FROM wallet_ledger
    WHERE created_at >= ${since}
    GROUP BY 1
  `;
}
function mapCount(rows) {
    const map = new Map();
    for (const row of rows)
        map.set(String(row.day).slice(0, 10), num(row.c));
    return map;
}
function bucketHour(rows) {
    const buckets = [0, 0, 0, 0, 0, 0];
    for (const row of rows) {
        const hour = num(row.hour);
        if (hour >= 0 && hour <= 23)
            buckets[Math.floor(hour / 4)] += num(row.c);
    }
    return buckets;
}
function bucketFlow(rows) {
    const buckets = Array.from({ length: 6 }, () => ({ grant: 0, revoke: 0 }));
    for (const row of rows) {
        const hour = num(row.hour);
        if (hour < 0 || hour > 23)
            continue;
        const slot = buckets[Math.floor(hour / 4)];
        slot.grant += num(row.grant);
        slot.revoke += num(row.revoke);
    }
    return buckets;
}
async function buildOverviewDesk(prisma, range, now = new Date()) {
    const since = sinceFor(range, now);
    const openSupport = {
        in: [client_1.SupportStatus.OPEN, client_1.SupportStatus.PENDING_REPLY],
    };
    const [activeCodes, lowStock, claimed, flagged, pushAgg, pendingSupport, activeStock, emptyActive, paused, exhausted, expired, threads, audits, claimDays, scratchDays, claimHours, scratchHours, flowDays, flowHours,] = await Promise.all([
        prisma.redeemCode.count({
            where: { status: client_1.RedeemCodeStatus.ACTIVE, stockLeft: { gt: 0 } },
        }),
        prisma.redeemCode.count({
            where: {
                status: client_1.RedeemCodeStatus.ACTIVE,
                stockLeft: { gt: 0, lte: overview_security_1.LOW_STOCK_MAX },
            },
        }),
        prisma.redeemClaim.count({
            where: { createdAt: { gte: since }, flagged: false },
        }),
        prisma.redeemClaim.count({
            where: { createdAt: { gte: since }, flagged: true },
        }),
        prisma.pushCampaign.aggregate({
            where: { status: 'SENT', sentAt: { gte: since } },
            _sum: { delivered: true },
        }),
        prisma.supportThread.count({ where: { status: openSupport } }),
        prisma.redeemCode.count({
            where: {
                status: client_1.RedeemCodeStatus.ACTIVE,
                stockLeft: { gt: overview_security_1.LOW_STOCK_MAX },
            },
        }),
        prisma.redeemCode.count({
            where: { status: client_1.RedeemCodeStatus.ACTIVE, stockLeft: { lte: 0 } },
        }),
        prisma.redeemCode.count({ where: { status: client_1.RedeemCodeStatus.PAUSED } }),
        prisma.redeemCode.count({ where: { status: client_1.RedeemCodeStatus.EXHAUSTED } }),
        prisma.redeemCode.count({ where: { status: client_1.RedeemCodeStatus.EXPIRED } }),
        prisma.supportThread.findMany({
            where: { status: openSupport },
            orderBy: { updatedAt: 'desc' },
            take: 10,
            select: {
                id: true,
                subject: true,
                status: true,
                unread: true,
                updatedAt: true,
            },
        }),
        prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: { actor: { select: { email: true, displayName: true } } },
        }),
        range === 'today' ? Promise.resolve([]) : claimsByDay(prisma, since),
        range === 'today' ? Promise.resolve([]) : scratchByDay(prisma, since),
        range === 'today' ? claimsByHour(prisma, since) : Promise.resolve([]),
        range === 'today' ? scratchByHour(prisma, since) : Promise.resolve([]),
        range === 'today' ? Promise.resolve([]) : flowByDay(prisma, since),
        range === 'today' ? flowByHour(prisma, since) : Promise.resolve([]),
    ]);
    const trend = range === 'today'
        ? ['00', '04', '08', '12', '16', '20'].map((label, i) => ({
            label,
            claims: bucketHour(claimHours)[i] ?? 0,
            scratch: bucketHour(scratchHours)[i] ?? 0,
        }))
        : (0, overview_series_1.utcDayKeys)(range === '30d' ? 30 : 7, now).map((day) => ({
            label: (0, overview_series_1.dayLabel)(day),
            claims: mapCount(claimDays).get(day) ?? 0,
            scratch: mapCount(scratchDays).get(day) ?? 0,
        }));
    const wallet = range === 'today'
        ? ['00', '04', '08', '12', '16', '20'].map((label, i) => ({
            label,
            grant: bucketFlow(flowHours)[i]?.grant ?? 0,
            revoke: bucketFlow(flowHours)[i]?.revoke ?? 0,
        }))
        : (0, overview_series_1.utcDayKeys)(range === '30d' ? 30 : 7, now).map((day) => {
            const row = flowDays.find((item) => String(item.day).slice(0, 10) === day);
            return {
                label: (0, overview_series_1.dayLabel)(day),
                grant: num(row?.grant),
                revoke: num(row?.revoke),
            };
        });
    const claimsToday = trend.reduce((sum, point) => sum + point.claims, 0);
    const walletNet = wallet.reduce((sum, day) => sum + day.grant - day.revoke, 0);
    return {
        kpis: {
            activeCodes,
            claimsToday,
            lowStock,
            pendingSupport,
            pushSends: pushAgg._sum.delivered ?? 0,
            walletNet,
        },
        trend,
        inventory: [
            { id: 'active', label: 'Active', count: activeStock, tone: 'emerald' },
            { id: 'low', label: 'Low stock', count: lowStock, tone: 'amber' },
            { id: 'empty', label: 'Out of stock', count: emptyActive, tone: 'slate' },
            { id: 'paused', label: 'Paused', count: paused, tone: 'slate' },
            { id: 'exhausted', label: 'Exhausted', count: exhausted, tone: 'sky' },
            { id: 'expired', label: 'Expired', count: expired, tone: 'rose' },
        ],
        claimsMix: [
            { id: 'claimed', label: 'Claimed', value: claimed, color: '#059669' },
            { id: 'flagged', label: 'Flagged', value: flagged, color: '#e11d48' },
        ].filter((slice) => slice.value > 0),
        support: threads.map((thread) => ({
            id: thread.id,
            subject: SUBJECT_LABEL[thread.subject] ?? thread.subject,
            priority: thread.unread
                ? 'P1'
                : thread.status === client_1.SupportStatus.OPEN
                    ? 'P2'
                    : 'P3',
            age: ageLabel(thread.updatedAt, now),
        })),
        wallet,
        activity: audits.map((row) => ({
            id: row.id,
            time: (0, audit_security_1.formatWhen)((0, audit_security_1.hoursAgo)(row.createdAt, now)),
            actor: row.actor?.displayName?.trim() ||
                row.actor?.email.split('@')[0] ||
                'system',
            action: (0, audit_security_1.humanAction)(row.action),
            module: (0, audit_security_1.mapCategory)(row.action),
        })),
        refreshedAt: now.toISOString(),
    };
}
//# sourceMappingURL=overview-desk.js.map