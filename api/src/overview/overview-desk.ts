import {
  PrismaClient,
  RedeemCodeStatus,
  SupportStatus,
} from '@prisma/client';
import {
  formatWhen,
  hoursAgo,
  humanAction,
  mapCategory,
} from '../audit/audit-security';
import { LOW_STOCK_MAX, startOfUtcDay } from './overview-security';
import { dayLabel, utcDayKeys } from './overview-series';

// --- Start: Dashboard desk live wire (Sachin) ---
export type DeskRange = 'today' | '7d' | '30d';

const SUBJECT_LABEL: Record<string, string> = {
  REPORT: 'Report',
  REDEEM_CODE_ISSUE: 'Redeem code issue',
  BUG: 'Bug',
  FEATURE: 'Feature',
  FEEDBACK: 'Feedback',
  OTHER: 'Other',
};

export function parseDeskRange(raw: string | undefined): DeskRange {
  if (raw === 'today' || raw === '30d') return raw;
  return '7d';
}

function sinceFor(range: DeskRange, now: Date): Date {
  if (range === 'today') return startOfUtcDay(now);
  const keys = utcDayKeys(range === '30d' ? 30 : 7, now);
  return new Date(`${keys[0]}T00:00:00.000Z`);
}

function num(value: bigint | number | null | undefined): number {
  return Number(value ?? 0);
}

function ageLabel(from: Date, now: Date): string {
  const mins = Math.floor(Math.max(0, now.getTime() - from.getTime()) / 60_000);
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

type DayCount = { day: string; c: bigint | number };
type HourCount = { hour: number; c: bigint | number };
type DayFlow = { day: string; grant: bigint | number; revoke: bigint | number };
type HourFlow = { hour: number; grant: bigint | number; revoke: bigint | number };

async function claimsByDay(prisma: PrismaClient, since: Date) {
  return prisma.$queryRaw<DayCount[]>`
    SELECT TO_CHAR((created_at AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS day,
           COUNT(*)::bigint AS c
    FROM redeem_claims
    WHERE created_at >= ${since}
    GROUP BY 1
  `;
}

async function scratchByDay(prisma: PrismaClient, since: Date) {
  return prisma.$queryRaw<DayCount[]>`
    SELECT TO_CHAR((created_at AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS day,
           COUNT(*)::bigint AS c
    FROM redeem_scratch_rolls
    WHERE created_at >= ${since}
    GROUP BY 1
  `;
}

async function claimsByHour(prisma: PrismaClient, since: Date) {
  return prisma.$queryRaw<HourCount[]>`
    SELECT EXTRACT(HOUR FROM (created_at AT TIME ZONE 'UTC'))::int AS hour,
           COUNT(*)::bigint AS c
    FROM redeem_claims
    WHERE created_at >= ${since}
    GROUP BY 1
  `;
}

async function scratchByHour(prisma: PrismaClient, since: Date) {
  return prisma.$queryRaw<HourCount[]>`
    SELECT EXTRACT(HOUR FROM (created_at AT TIME ZONE 'UTC'))::int AS hour,
           COUNT(*)::bigint AS c
    FROM redeem_scratch_rolls
    WHERE created_at >= ${since}
    GROUP BY 1
  `;
}

async function flowByDay(prisma: PrismaClient, since: Date) {
  return prisma.$queryRaw<DayFlow[]>`
    SELECT TO_CHAR((created_at AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS day,
           COALESCE(SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END), 0)::bigint AS grant,
           COALESCE(SUM(CASE WHEN delta < 0 THEN -delta ELSE 0 END), 0)::bigint AS revoke
    FROM wallet_ledger
    WHERE created_at >= ${since}
    GROUP BY 1
  `;
}

async function flowByHour(prisma: PrismaClient, since: Date) {
  return prisma.$queryRaw<HourFlow[]>`
    SELECT EXTRACT(HOUR FROM (created_at AT TIME ZONE 'UTC'))::int AS hour,
           COALESCE(SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END), 0)::bigint AS grant,
           COALESCE(SUM(CASE WHEN delta < 0 THEN -delta ELSE 0 END), 0)::bigint AS revoke
    FROM wallet_ledger
    WHERE created_at >= ${since}
    GROUP BY 1
  `;
}

function mapCount(rows: DayCount[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) map.set(String(row.day).slice(0, 10), num(row.c));
  return map;
}

function bucketHour(rows: HourCount[]): number[] {
  const buckets = [0, 0, 0, 0, 0, 0];
  for (const row of rows) {
    const hour = num(row.hour);
    if (hour >= 0 && hour <= 23) buckets[Math.floor(hour / 4)] += num(row.c);
  }
  return buckets;
}

function bucketFlow(rows: HourFlow[]): Array<{ grant: number; revoke: number }> {
  const buckets = Array.from({ length: 6 }, () => ({ grant: 0, revoke: 0 }));
  for (const row of rows) {
    const hour = num(row.hour);
    if (hour < 0 || hour > 23) continue;
    const slot = buckets[Math.floor(hour / 4)];
    slot.grant += num(row.grant);
    slot.revoke += num(row.revoke);
  }
  return buckets;
}

export async function buildOverviewDesk(
  prisma: PrismaClient,
  range: DeskRange,
  now = new Date(),
) {
  const since = sinceFor(range, now);
  const openSupport = {
    in: [SupportStatus.OPEN, SupportStatus.PENDING_REPLY],
  };

  const [
    activeCodes,
    lowStock,
    claimed,
    flagged,
    pushAgg,
    pendingSupport,
    activeStock,
    emptyActive,
    paused,
    exhausted,
    expired,
    threads,
    audits,
    claimDays,
    scratchDays,
    claimHours,
    scratchHours,
    flowDays,
    flowHours,
  ] = await Promise.all([
    prisma.redeemCode.count({
      where: { status: RedeemCodeStatus.ACTIVE, stockLeft: { gt: 0 } },
    }),
    prisma.redeemCode.count({
      where: {
        status: RedeemCodeStatus.ACTIVE,
        stockLeft: { gt: 0, lte: LOW_STOCK_MAX },
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
        status: RedeemCodeStatus.ACTIVE,
        stockLeft: { gt: LOW_STOCK_MAX },
      },
    }),
    prisma.redeemCode.count({
      where: { status: RedeemCodeStatus.ACTIVE, stockLeft: { lte: 0 } },
    }),
    prisma.redeemCode.count({ where: { status: RedeemCodeStatus.PAUSED } }),
    prisma.redeemCode.count({ where: { status: RedeemCodeStatus.EXHAUSTED } }),
    prisma.redeemCode.count({ where: { status: RedeemCodeStatus.EXPIRED } }),
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
    range === 'today' ? Promise.resolve([] as DayCount[]) : claimsByDay(prisma, since),
    range === 'today' ? Promise.resolve([] as DayCount[]) : scratchByDay(prisma, since),
    range === 'today' ? claimsByHour(prisma, since) : Promise.resolve([] as HourCount[]),
    range === 'today' ? scratchByHour(prisma, since) : Promise.resolve([] as HourCount[]),
    range === 'today' ? Promise.resolve([] as DayFlow[]) : flowByDay(prisma, since),
    range === 'today' ? flowByHour(prisma, since) : Promise.resolve([] as HourFlow[]),
  ]);

  const trend =
    range === 'today'
      ? ['00', '04', '08', '12', '16', '20'].map((label, i) => ({
          label,
          claims: bucketHour(claimHours)[i] ?? 0,
          scratch: bucketHour(scratchHours)[i] ?? 0,
        }))
      : utcDayKeys(range === '30d' ? 30 : 7, now).map((day) => ({
          label: dayLabel(day),
          claims: mapCount(claimDays).get(day) ?? 0,
          scratch: mapCount(scratchDays).get(day) ?? 0,
        }));

  const wallet =
    range === 'today'
      ? ['00', '04', '08', '12', '16', '20'].map((label, i) => ({
          label,
          grant: bucketFlow(flowHours)[i]?.grant ?? 0,
          revoke: bucketFlow(flowHours)[i]?.revoke ?? 0,
        }))
      : utcDayKeys(range === '30d' ? 30 : 7, now).map((day) => {
          const row = flowDays.find((item) => String(item.day).slice(0, 10) === day);
          return {
            label: dayLabel(day),
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
      { id: 'active', label: 'Active', count: activeStock, tone: 'emerald' as const },
      { id: 'low', label: 'Low stock', count: lowStock, tone: 'amber' as const },
      { id: 'empty', label: 'Out of stock', count: emptyActive, tone: 'slate' as const },
      { id: 'paused', label: 'Paused', count: paused, tone: 'slate' as const },
      { id: 'exhausted', label: 'Exhausted', count: exhausted, tone: 'sky' as const },
      { id: 'expired', label: 'Expired', count: expired, tone: 'rose' as const },
    ],
    claimsMix: [
      { id: 'claimed', label: 'Claimed', value: claimed, color: '#059669' },
      { id: 'flagged', label: 'Flagged', value: flagged, color: '#e11d48' },
    ].filter((slice) => slice.value > 0),
    support: threads.map((thread) => ({
      id: thread.id,
      subject: SUBJECT_LABEL[thread.subject] ?? thread.subject,
      priority: thread.unread
        ? ('P1' as const)
        : thread.status === SupportStatus.OPEN
          ? ('P2' as const)
          : ('P3' as const),
      age: ageLabel(thread.updatedAt, now),
    })),
    wallet,
    activity: audits.map((row) => ({
      id: row.id,
      time: formatWhen(hoursAgo(row.createdAt, now)),
      actor:
        row.actor?.displayName?.trim() ||
        row.actor?.email.split('@')[0] ||
        'system',
      action: humanAction(row.action),
      module: mapCategory(row.action),
    })),
    refreshedAt: now.toISOString(),
  };
}
// --- End: Dashboard desk live wire (Sachin) ---
