"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OVERVIEW_SERIES_RANGES = void 0;
exports.parseOverviewSeriesRange = parseOverviewSeriesRange;
exports.seriesDayCount = seriesDayCount;
exports.utcDayKeys = utcDayKeys;
exports.dayLabel = dayLabel;
exports.buildOverviewSeries = buildOverviewSeries;
const analytics_security_1 = require("../analytics/analytics-security");
const overview_security_1 = require("./overview-security");
exports.OVERVIEW_SERIES_RANGES = ['7d', '30d'];
function parseOverviewSeriesRange(raw) {
    if (raw === '30d')
        return '30d';
    return '7d';
}
function seriesDayCount(range) {
    return range === '30d' ? 30 : 7;
}
function utcDayKeys(days, now = new Date()) {
    const today = (0, overview_security_1.startOfUtcDay)(now);
    const keys = [];
    for (let i = days - 1; i >= 0; i -= 1) {
        const d = new Date(today.getTime() - i * 86_400_000);
        keys.push(d.toISOString().slice(0, 10));
    }
    return keys;
}
function dayLabel(isoDay) {
    const d = new Date(`${isoDay}T00:00:00.000Z`);
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
    });
}
function toCountMap(rows) {
    const map = new Map();
    for (const row of rows) {
        const key = typeof row.day === 'string'
            ? row.day.slice(0, 10)
            : String(row.day).slice(0, 10);
        map.set(key, Number(row.c));
    }
    return map;
}
async function dailyDistinctOpens(prisma, since) {
    const rows = await prisma.$queryRaw `
    SELECT TO_CHAR((created_at AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS day,
           COUNT(DISTINCT COALESCE(install_id, user_id))::bigint AS c
    FROM app_analytics_events
    WHERE name IN ('app_open', 'home_open')
      AND created_at >= ${since}
    GROUP BY 1
    ORDER BY 1
  `;
    return toCountMap(rows);
}
async function dailyClaims(prisma, since) {
    const rows = await prisma.$queryRaw `
    SELECT TO_CHAR((created_at AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS day,
           COUNT(*)::bigint AS c
    FROM redeem_claims
    WHERE created_at >= ${since}
    GROUP BY 1
    ORDER BY 1
  `;
    return toCountMap(rows);
}
async function dailySignups(prisma, since) {
    const rows = await prisma.$queryRaw `
    SELECT TO_CHAR((created_at AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS day,
           COUNT(*)::bigint AS c
    FROM users
    WHERE created_at >= ${since}
    GROUP BY 1
    ORDER BY 1
  `;
    return toCountMap(rows);
}
async function dailyScreenVisits(prisma, since) {
    const rows = await prisma.$queryRaw `
    SELECT TO_CHAR((created_at AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS day,
           COUNT(*)::bigint AS c
    FROM app_analytics_events
    WHERE name = 'screen_session'
      AND created_at >= ${since}
    GROUP BY 1
    ORDER BY 1
  `;
    return toCountMap(rows);
}
async function rangeFunnel(prisma, since) {
    const [installs, firstOpen, signups, firstClaims] = await Promise.all([
        prisma.deviceInstall.count({ where: { createdAt: { gte: since } } }),
        prisma.$queryRaw `
      SELECT COUNT(*)::bigint AS c
      FROM (
        SELECT install_id
        FROM app_analytics_events
        WHERE name = 'app_open'
          AND install_id IS NOT NULL
        GROUP BY install_id
        HAVING MIN(created_at) >= ${since}
      ) t
    `.then((rows) => Number(rows[0]?.c ?? 0)),
        prisma.user.count({ where: { createdAt: { gte: since } } }),
        prisma.$queryRaw `
      SELECT COUNT(*)::bigint AS c
      FROM (
        SELECT user_id
        FROM redeem_claims
        WHERE user_id IS NOT NULL
        GROUP BY user_id
        HAVING MIN(created_at) >= ${since}
      ) t
    `.then((rows) => Number(rows[0]?.c ?? 0)),
    ]);
    return {
        installs,
        firstOpen,
        signups,
        firstClaims,
    };
}
async function topScreensRange(prisma, since) {
    const top = await prisma.$queryRaw `
    SELECT
      props_json->>'screen' AS screen,
      SUM(
        CASE
          WHEN props_json->>'duration_ms' ~ '^[0-9]+$'
          THEN LEAST((props_json->>'duration_ms')::bigint, ${analytics_security_1.SCREEN_SESSION_MAX_MS})
          ELSE 0
        END
      )::bigint AS total_ms,
      COUNT(*)::bigint AS visits
    FROM app_analytics_events
    WHERE name = 'screen_session'
      AND created_at >= ${since}
      AND props_json->>'screen' ~ '^[a-z][a-z0-9_]{0,31}$'
    GROUP BY props_json->>'screen'
    ORDER BY total_ms DESC
    LIMIT 6
  `;
    return top.map((row) => ({
        screen: row.screen,
        seconds: Math.round(Number(row.total_ms) / 1000),
        visits: Number(row.visits),
    }));
}
async function buildOverviewSeries(prisma, range, now = new Date()) {
    const days = seriesDayCount(range);
    const keys = utcDayKeys(days, now);
    const since = new Date(`${keys[0]}T00:00:00.000Z`);
    const [dauMap, claimsMap, signupsMap, screensMap, funnel, topScreens] = await Promise.all([
        dailyDistinctOpens(prisma, since),
        dailyClaims(prisma, since),
        dailySignups(prisma, since),
        dailyScreenVisits(prisma, since),
        rangeFunnel(prisma, since),
        topScreensRange(prisma, since),
    ]);
    const points = keys.map((day) => ({
        day,
        label: dayLabel(day),
        dau: dauMap.get(day) ?? 0,
        claims: claimsMap.get(day) ?? 0,
        signups: signupsMap.get(day) ?? 0,
        screenVisits: screensMap.get(day) ?? 0,
    }));
    return {
        range,
        dayBasis: 'utc',
        points,
        funnel,
        topScreens,
        refreshedAt: now.toISOString(),
    };
}
//# sourceMappingURL=overview-series.js.map