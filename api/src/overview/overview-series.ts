import { PrismaService } from '../prisma/prisma.service';
import { SCREEN_SESSION_MAX_MS } from '../analytics/analytics-security';
import { startOfUtcDay } from './overview-security';

// --- Start: Overview series charts (Sachin) ---
export type OverviewSeriesRange = '7d' | '30d';

export const OVERVIEW_SERIES_RANGES: OverviewSeriesRange[] = ['7d', '30d'];

export function parseOverviewSeriesRange(
  raw: string | undefined,
): OverviewSeriesRange {
  if (raw === '30d') return '30d';
  return '7d';
}

export function seriesDayCount(range: OverviewSeriesRange): number {
  return range === '30d' ? 30 : 7;
}

/** Inclusive UTC calendar days ending today (oldest → newest). */
export function utcDayKeys(days: number, now = new Date()): string[] {
  const today = startOfUtcDay(now);
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today.getTime() - i * 86_400_000);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

export function dayLabel(isoDay: string): string {
  const d = new Date(`${isoDay}T00:00:00.000Z`);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

type DayCountRow = { day: string; c: bigint | number };

function toCountMap(rows: DayCountRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key =
      typeof row.day === 'string'
        ? row.day.slice(0, 10)
        : String(row.day).slice(0, 10);
    map.set(key, Number(row.c));
  }
  return map;
}

async function dailyDistinctOpens(
  prisma: PrismaService,
  since: Date,
): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<DayCountRow[]>`
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

async function dailyClaims(
  prisma: PrismaService,
  since: Date,
): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<DayCountRow[]>`
    SELECT TO_CHAR((created_at AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS day,
           COUNT(*)::bigint AS c
    FROM redeem_claims
    WHERE created_at >= ${since}
    GROUP BY 1
    ORDER BY 1
  `;
  return toCountMap(rows);
}

async function dailySignups(
  prisma: PrismaService,
  since: Date,
): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<DayCountRow[]>`
    SELECT TO_CHAR((created_at AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS day,
           COUNT(*)::bigint AS c
    FROM users
    WHERE created_at >= ${since}
    GROUP BY 1
    ORDER BY 1
  `;
  return toCountMap(rows);
}

async function dailyScreenVisits(
  prisma: PrismaService,
  since: Date,
): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<DayCountRow[]>`
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

async function rangeFunnel(prisma: PrismaService, since: Date) {
  const [installs, firstOpen, signups, firstClaims] = await Promise.all([
    prisma.deviceInstall.count({ where: { createdAt: { gte: since } } }),
    prisma.$queryRaw<Array<{ c: bigint }>>`
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
    prisma.$queryRaw<Array<{ c: bigint }>>`
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

async function topScreensRange(prisma: PrismaService, since: Date) {
  const top = await prisma.$queryRaw<
    Array<{ screen: string; total_ms: bigint; visits: bigint }>
  >`
    SELECT
      props_json->>'screen' AS screen,
      SUM(
        CASE
          WHEN props_json->>'duration_ms' ~ '^[0-9]+$'
          THEN LEAST((props_json->>'duration_ms')::bigint, ${SCREEN_SESSION_MAX_MS})
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

export async function buildOverviewSeries(
  prisma: PrismaService,
  range: OverviewSeriesRange,
  now = new Date(),
) {
  const days = seriesDayCount(range);
  const keys = utcDayKeys(days, now);
  const since = new Date(`${keys[0]}T00:00:00.000Z`);

  const [dauMap, claimsMap, signupsMap, screensMap, funnel, topScreens] =
    await Promise.all([
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
    dayBasis: 'utc' as const,
    points,
    funnel,
    topScreens,
    refreshedAt: now.toISOString(),
  };
}
// --- End: Overview series charts (Sachin) ---
