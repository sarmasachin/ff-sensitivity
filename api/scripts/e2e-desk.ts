/**
 * Dashboard desk e2e: HTTP /api/v1/admin/overview/desk vs direct DB counts.
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { startOfUtcDay } from '../src/overview/overview-security';
import { utcDayKeys } from '../src/overview/overview-series';

const API = process.env.API_BASE ?? 'http://127.0.0.1:4000';
const prisma = new PrismaClient();

function loadEnv() {
  const raw = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[match[1]]) process.env[match[1]] = value;
  }
}

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];
function pass(name: string, detail?: string) {
  checks.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name: string, detail?: string) {
  checks.push({ name, ok: false, detail });
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

function readAccessCookie(res: Response): string | undefined {
  const cookies =
    typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  for (const cookie of cookies) {
    const match = /^access_token=([^;]+)/.exec(cookie);
    if (match) return decodeURIComponent(match[1]);
  }
  return undefined;
}

async function req(
  method: string,
  pathName: string,
  opts?: { token?: string; body?: unknown },
) {
  const res = await fetch(`${API}${pathName}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(opts?.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 300) };
  }
  return { status: res.status, json, token: readAccessCookie(res) };
}

function sinceFor(range: 'today' | '7d' | '30d', now: Date): Date {
  if (range === 'today') return startOfUtcDay(now);
  const keys = utcDayKeys(range === '30d' ? 30 : 7, now);
  return new Date(`${keys[0]}T00:00:00.000Z`);
}

function shapeOk(j: any, points: number): boolean {
  return (
    j &&
    typeof j.kpis?.activeCodes === 'number' &&
    typeof j.kpis?.claimsToday === 'number' &&
    typeof j.kpis?.lowStock === 'number' &&
    typeof j.kpis?.pendingSupport === 'number' &&
    typeof j.kpis?.pushSends === 'number' &&
    typeof j.kpis?.walletNet === 'number' &&
    Array.isArray(j.trend) &&
    j.trend.length === points &&
    j.trend.every(
      (p: any) =>
        typeof p.label === 'string' &&
        typeof p.claims === 'number' &&
        typeof p.scratch === 'number',
    ) &&
    Array.isArray(j.inventory) &&
    j.inventory.length === 6 &&
    Array.isArray(j.claimsMix) &&
    Array.isArray(j.support) &&
    Array.isArray(j.wallet) &&
    j.wallet.length === points &&
    Array.isArray(j.activity) &&
    typeof j.refreshedAt === 'string'
  );
}

async function main() {
  loadEnv();
  const now = new Date();
  const email = process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';
  const password = process.env.SUPERADMIN_PASSWORD ?? '123456';

  {
    const r = await req('GET', '/api/v1/admin/overview/desk');
    r.status === 401
      ? pass('desk_auth_required', `status=${r.status}`)
      : fail('desk_auth_required', `status=${r.status} body=${JSON.stringify(r.json)?.slice(0, 180)}`);
  }

  const login = await req('POST', '/api/v1/auth/login', {
    body: { email, password },
  });
  if (login.status !== 200 && login.status !== 201) {
    fail('admin_login', `status=${login.status}`);
    console.log(`RESULT fail=${checks.filter((c) => !c.ok).length}`);
    await prisma.$disconnect();
    process.exit(1);
  }
  if (login.json?.requiresOtp) {
    fail('admin_login', 'otp required');
    await prisma.$disconnect();
    process.exit(1);
  }
  const token = login.token;
  if (!token) {
    fail('admin_login', 'no access cookie');
    await prisma.$disconnect();
    process.exit(1);
  }
  pass('admin_login', `role=${login.json?.admin?.role ?? 'unknown'}`);

  const cases: Array<{ name: string; query: string; range: 'today' | '7d' | '30d'; points: number }> = [
    { name: 'default', query: '', range: '7d', points: 7 },
    { name: 'today', query: '?range=today', range: 'today', points: 6 },
    { name: '7d', query: '?range=7d', range: '7d', points: 7 },
    { name: '30d', query: '?range=30d', range: '30d', points: 30 },
    { name: 'bad_range', query: '?range=nope', range: '7d', points: 7 },
  ];

  for (const item of cases) {
    const r = await req('GET', `/api/v1/admin/overview/desk${item.query}`, { token });
    if (r.status !== 200 || !shapeOk(r.json, item.points)) {
      fail(`shape_${item.name}`, `status=${r.status} body=${JSON.stringify(r.json)?.slice(0, 240)}`);
      continue;
    }
    pass(`shape_${item.name}`, `points=${r.json.trend.length}`);

    const since = sinceFor(item.range, now);
    const [
      claims,
      scratch,
      active,
      low,
      pending,
      codes,
      activeStatus,
      audits,
      push,
      walletDb,
    ] = await Promise.all([
      prisma.redeemClaim.count({ where: { createdAt: { gte: since } } }),
      prisma.redeemScratchRoll.count({ where: { createdAt: { gte: since } } }),
      prisma.redeemCode.count({ where: { status: 'ACTIVE', stockLeft: { gt: 0 } } }),
      prisma.redeemCode.count({
        where: { status: 'ACTIVE', stockLeft: { gt: 0, lte: 10 } },
      }),
      prisma.supportThread.count({
        where: { status: { in: ['OPEN', 'PENDING_REPLY'] } },
      }),
      prisma.redeemCode.count(),
      prisma.redeemCode.count({ where: { status: 'ACTIVE' } }),
      prisma.auditLog.count(),
      prisma.pushCampaign.aggregate({
        where: { status: 'SENT', sentAt: { gte: since } },
        _sum: { delivered: true },
      }),
      prisma.$queryRaw<Array<{ net: bigint }>>`
        SELECT COALESCE(SUM(delta), 0)::bigint AS net
        FROM wallet_ledger
        WHERE created_at >= ${since}
      `,
    ]);

    const j = r.json;
    const sumClaims = j.trend.reduce((s: number, p: any) => s + p.claims, 0);
    const sumScratch = j.trend.reduce((s: number, p: any) => s + p.scratch, 0);
    const walletNet = j.wallet.reduce((s: number, d: any) => s + d.grant - d.revoke, 0);
    const mix = j.claimsMix.reduce((s: number, d: any) => s + d.value, 0);
    const inventory = j.inventory.reduce((s: number, d: any) => s + d.count, 0);
    const activeParts =
      j.inventory.find((d: any) => d.id === 'active')?.count +
      j.inventory.find((d: any) => d.id === 'low')?.count +
      j.inventory.find((d: any) => d.id === 'empty')?.count;
    const labels = new Set(j.trend.map((p: any) => p.label));

    sumClaims === claims && j.kpis.claimsToday === claims
      ? pass(`${item.name}_claims`, `${claims}`)
      : fail(`${item.name}_claims`, `trend=${sumClaims} kpi=${j.kpis.claimsToday} db=${claims}`);
    sumScratch === scratch
      ? pass(`${item.name}_scratch`, `${scratch}`)
      : fail(`${item.name}_scratch`, `trend=${sumScratch} db=${scratch}`);
    mix === claims
      ? pass(`${item.name}_mix`, `${mix}`)
      : fail(`${item.name}_mix`, `mix=${mix} db=${claims}`);
    j.kpis.walletNet === walletNet && walletNet === Number(walletDb[0]?.net ?? 0)
      ? pass(`${item.name}_wallet`, `${walletNet}`)
      : fail(
          `${item.name}_wallet`,
          `kpi=${j.kpis.walletNet} bars=${walletNet} db=${Number(walletDb[0]?.net ?? 0)}`,
        );
    j.kpis.activeCodes === active
      ? pass(`${item.name}_active`, `${active}`)
      : fail(`${item.name}_active`, `kpi=${j.kpis.activeCodes} db=${active}`);
    j.kpis.lowStock === low
      ? pass(`${item.name}_low`, `${low}`)
      : fail(`${item.name}_low`, `kpi=${j.kpis.lowStock} db=${low}`);
    j.kpis.pendingSupport === pending && j.support.length === Math.min(10, pending)
      ? pass(`${item.name}_support`, `${j.support.length}/${pending}`)
      : fail(`${item.name}_support`, `kpi=${j.kpis.pendingSupport} rows=${j.support.length} db=${pending}`);
    inventory === codes
      ? pass(`${item.name}_inventory`, `${inventory}`)
      : fail(`${item.name}_inventory`, `bars=${inventory} db=${codes}`);
    activeParts === activeStatus
      ? pass(`${item.name}_active_split`, `${activeParts}`)
      : fail(`${item.name}_active_split`, `parts=${activeParts} db=${activeStatus}`);
    j.kpis.pushSends === (push._sum.delivered ?? 0)
      ? pass(`${item.name}_push`, `${j.kpis.pushSends}`)
      : fail(`${item.name}_push`, `kpi=${j.kpis.pushSends} db=${push._sum.delivered}`);
    j.activity.length === Math.min(10, audits)
      ? pass(`${item.name}_activity`, `${j.activity.length}/${audits}`)
      : fail(`${item.name}_activity`, `rows=${j.activity.length} db=${audits}`);
    labels.size === j.trend.length
      ? pass(`${item.name}_unique_labels`)
      : fail(`${item.name}_unique_labels`, `${labels.size} of ${j.trend.length}`);
    j.support.every((row: any) => ['P1', 'P2', 'P3'].includes(row.priority) && typeof row.subject === 'string' && row.subject.length > 0)
      ? pass(`${item.name}_support_rows`)
      : fail(`${item.name}_support_rows`);
    !Number.isNaN(Date.parse(j.refreshedAt))
      ? pass(`${item.name}_refreshed`)
      : fail(`${item.name}_refreshed`, j.refreshedAt);
  }

  {
    const r = await req('GET', '/api/v1/admin/overview/desk?range=7d', { token });
    const raw = JSON.stringify(r.json);
    const banned = [
      'Redeem code not credited',
      'Wallet balance mismatch',
      'Push not received on Android 14',
      'Shop SKU out of sync',
      'Challenge leaderboard delay',
      'Name frame upload rejected',
      'Scratch card not opening',
      'Promo code expired early',
      'Device ban appeal',
      'Daily challenge reward missing',
      't-1042',
      't-1031',
      'ops.riya',
      'ops.kabir',
      'Naveen Root',
      'Priya Ops',
      'Pixel 7',
      'dev_8f2a91c0',
      'local demo',
    ];
    const hit = banned.filter((text) => raw.includes(text));
    hit.length === 0
      ? pass('no_dummy_strings')
      : fail('no_dummy_strings', hit.join(', '));

    const supportIds = (r.json?.support ?? []).map((row: { id: string }) => row.id);
    const activityIds = (r.json?.activity ?? []).map((row: { id: string }) => row.id);
    const [supportRows, auditRows] = await Promise.all([
      prisma.supportThread.findMany({
        where: { id: { in: supportIds.length ? supportIds : ['__none__'] } },
        select: { id: true, subject: true, status: true },
      }),
      prisma.auditLog.findMany({
        where: { id: { in: activityIds.length ? activityIds : ['__none__'] } },
        select: { id: true, action: true },
      }),
    ]);
    supportIds.length === supportRows.length
      ? pass('support_ids_in_db', supportRows.map((row) => `${row.subject}/${row.status}`).join(', ') || 'none')
      : fail('support_ids_in_db', `api=${supportIds.length} db=${supportRows.length}`);
    activityIds.length === auditRows.length
      ? pass('activity_ids_in_db', auditRows.map((row) => row.action).join(', '))
      : fail('activity_ids_in_db', `api=${activityIds.length} db=${auditRows.length}`);
    console.log(`LIVE support=${JSON.stringify(r.json?.support)}`);
    console.log(
      `LIVE activity=${JSON.stringify(
        (r.json?.activity ?? []).map((row: { actor: string; action: string; module: string }) => ({
          actor: row.actor,
          action: row.action,
          module: row.module,
        })),
      )}`,
    );
    console.log(`LIVE inventory=${JSON.stringify(r.json?.inventory)}`);
    console.log(`LIVE kpis=${JSON.stringify(r.json?.kpis)}`);
  }

  {
    const r = await req('POST', '/api/v1/admin/overview/desk', { token, body: {} });
    r.status === 404 || r.status === 405
      ? pass('desk_no_post', `status=${r.status}`)
      : fail('desk_no_post', `status=${r.status}`);
  }

  const failed = checks.filter((c) => !c.ok);
  console.log(`RESULT pass=${checks.length - failed.length} fail=${failed.length}`);
  await prisma.$disconnect();
  if (failed.length) process.exit(1);
}

main().catch(async (error: unknown) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
