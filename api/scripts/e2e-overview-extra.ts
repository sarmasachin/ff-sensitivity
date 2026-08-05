/**
 * Overview KPI extra security / consistency e2e (local Postgres).
 */
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';

const API = process.env.API_BASE ?? 'http://127.0.0.1:4000';
const prisma = new PrismaClient();

function loadEnv() {
  const raw = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
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
function okAuth(status: number) {
  return status === 200 || status === 201;
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
    json = { raw: text };
  }
  return { status: res.status, json };
}

const FORBIDDEN_KEYS = [
  'email',
  'password',
  'passwordHash',
  'token',
  'fcmToken',
  'codeSecret',
  'googleSub',
  'phone',
  'apiKey',
];

async function main() {
  loadEnv();
  const adminEmail = process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';
  const adminPassword = process.env.SUPERADMIN_PASSWORD ?? '123456';
  const stamp = Date.now().toString(36);
  let cleanupUserId: string | null = null;

  const login = await req('POST', '/api/v1/auth/login', {
    body: { email: adminEmail, password: adminPassword },
  });
  if (!okAuth(login.status) || !login.json?.accessToken) {
    fail('admin_login');
    await prisma.$disconnect();
    process.exit(1);
  }
  pass('admin_login');
  const tok = login.json.accessToken as string;

  const snap = await req('GET', '/api/v1/admin/overview', { token: tok });
  if (snap.status !== 200 || !snap.json?.users) {
    fail('snapshot');
    await prisma.$disconnect();
    process.exit(1);
  }
  pass('snapshot');
  const j = snap.json;

  {
    const u = j.users;
    const sum = u.active + u.restricted + u.suspended;
    sum === u.total
      ? pass('users_partition_ok', `sum=${sum}`)
      : fail('users_partition_ok', `sum=${sum} total=${u.total}`);
  }

  {
    const d = j.devices;
    const sum = d.active72h + d.stale + d.blocked;
    sum === d.total
      ? pass('devices_partition_ok', `sum=${sum}`)
      : fail('devices_partition_ok', `sum=${sum} total=${d.total}`);
  }

  {
    const ok =
      j.meta?.staleHours === 72 &&
      j.meta?.pushActiveDays === 7 &&
      j.meta?.lowStockMax === 10 &&
      j.meta?.dayBasis === 'utc';
    ok ? pass('meta_constants_ok') : fail('meta_constants_ok', JSON.stringify(j.meta));
  }

  {
    const blob = JSON.stringify(j);
    const hasAt = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(blob);
    const hasForbidden = FORBIDDEN_KEYS.some((k) =>
      Object.prototype.hasOwnProperty.call(
        flattenKeys(j),
        k.toLowerCase(),
      ),
    );
    !hasAt && !hasForbidden
      ? pass('no_pii_in_payload')
      : fail('no_pii_in_payload', `at=${hasAt} keys=${hasForbidden}`);
  }

  {
    const dbClaims = await prisma.redeemClaim.count({
      where: {
        createdAt: {
          gte: new Date(
            Date.UTC(
              new Date().getUTCFullYear(),
              new Date().getUTCMonth(),
              new Date().getUTCDate(),
            ),
          ),
        },
      },
    });
    j.today.claims === dbClaims
      ? pass('claims_today_matches_db', `n=${dbClaims}`)
      : fail(
          'claims_today_matches_db',
          `api=${j.today.claims} db=${dbClaims}`,
        );
  }

  {
    const dbSupport = await prisma.supportThread.count({
      where: { status: { in: ['OPEN', 'PENDING_REPLY'] } },
    });
    j.today.pendingSupport === dbSupport
      ? pass('pending_support_matches_db', `n=${dbSupport}`)
      : fail(
          'pending_support_matches_db',
          `api=${j.today.pendingSupport} db=${dbSupport}`,
        );
  }

  {
    const user = await prisma.user.create({
      data: {
        googleSub: `e2e-overview-extra-${stamp}`,
        email: `e2e.overview.extra.${stamp}@example.com`,
        displayName: 'Overview Extra',
        isActive: true,
        coins: 0,
      },
    });
    cleanupUserId = user.id;
    const userTok = jwt.sign(
      { sub: user.id, email: user.email, aud: 'user' },
      process.env.JWT_USER_SECRET!,
      { expiresIn: '1h' },
    );
    const r = await req('GET', '/api/v1/admin/overview', { token: userTok });
    r.status === 401
      ? pass('user_jwt_blocked_admin')
      : fail('user_jwt_blocked_admin', `status=${r.status}`);
  }

  {
    const r = await req('GET', '/api/v1/admin/overview', {
      token: 'not.a.jwt',
    });
    r.status === 401
      ? pass('bad_token_rejected')
      : fail('bad_token_rejected', `status=${r.status}`);
  }

  // --- Series charts cross-check ---
  const series7 = await req('GET', '/api/v1/admin/overview/series?range=7d', {
    token: tok,
  });
  if (series7.status !== 200 || !Array.isArray(series7.json?.points)) {
    fail('series_snapshot');
  } else {
    pass('series_snapshot', `points=${series7.json.points.length}`);
    const s = series7.json;

    {
      const blob = JSON.stringify(s);
      const hasAt = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(blob);
      const hasForbidden = FORBIDDEN_KEYS.some((k) =>
        Object.prototype.hasOwnProperty.call(
          flattenKeys(s),
          k.toLowerCase(),
        ),
      );
      !hasAt && !hasForbidden
        ? pass('series_no_pii')
        : fail('series_no_pii', `at=${hasAt} keys=${hasForbidden}`);
    }

    {
      const days = s.points.map((p: { day: string }) => p.day);
      const unique = new Set(days);
      const sorted = [...days].sort();
      unique.size === days.length &&
      days.length === 7 &&
      JSON.stringify(days) === JSON.stringify(sorted)
        ? pass('series_days_monotonic_unique')
        : fail(
            'series_days_monotonic_unique',
            `n=${days.length} unique=${unique.size}`,
          );
    }

    {
      const since = new Date(`${s.points[0].day}T00:00:00.000Z`);
      const dbClaims = await prisma.redeemClaim.count({
        where: { createdAt: { gte: since } },
      });
      const sumClaims = s.points.reduce(
        (a: number, p: { claims: number }) => a + p.claims,
        0,
      );
      sumClaims === dbClaims
        ? pass('series_claims_sum_matches_db', `n=${dbClaims}`)
        : fail(
            'series_claims_sum_matches_db',
            `api=${sumClaims} db=${dbClaims}`,
          );
    }

    {
      const since = new Date(`${s.points[0].day}T00:00:00.000Z`);
      const dbSignups = await prisma.user.count({
        where: { createdAt: { gte: since } },
      });
      const sumSignups = s.points.reduce(
        (a: number, p: { signups: number }) => a + p.signups,
        0,
      );
      const funnelSignups = s.funnel?.signups;
      sumSignups === dbSignups && funnelSignups === dbSignups
        ? pass('series_signups_match_db', `n=${dbSignups}`)
        : fail(
            'series_signups_match_db',
            `sum=${sumSignups} funnel=${funnelSignups} db=${dbSignups}`,
          );
    }

    {
      const since = new Date(`${s.points[0].day}T00:00:00.000Z`);
      const dbVisits = await prisma.appAnalyticsEvent.count({
        where: {
          name: 'screen_session',
          createdAt: { gte: since },
        },
      });
      const sumVisits = s.points.reduce(
        (a: number, p: { screenVisits: number }) => a + p.screenVisits,
        0,
      );
      sumVisits === dbVisits
        ? pass('series_screen_visits_match_db', `n=${dbVisits}`)
        : fail(
            'series_screen_visits_match_db',
            `api=${sumVisits} db=${dbVisits}`,
          );
    }

    {
      const since = new Date(`${s.points[0].day}T00:00:00.000Z`);
      const dbInstalls = await prisma.deviceInstall.count({
        where: { createdAt: { gte: since } },
      });
      s.funnel?.installs === dbInstalls
        ? pass('series_funnel_installs_match_db', `n=${dbInstalls}`)
        : fail(
            'series_funnel_installs_match_db',
            `api=${s.funnel?.installs} db=${dbInstalls}`,
          );
    }

    {
      const ok = (s.topScreens as Array<{ screen: string }>).every((row) =>
        /^[a-z][a-z0-9_]{0,31}$/.test(row.screen),
      );
      ok
        ? pass('series_screens_sanitized')
        : fail('series_screens_sanitized');
    }
  }

  {
    const r = await req(
      'GET',
      '/api/v1/admin/overview/series?range=bogus;drop',
      { token: tok },
    );
    r.status === 200 && r.json?.range === '7d' && r.json?.points?.length === 7
      ? pass('series_invalid_range_defaults_7d')
      : fail('series_invalid_range_defaults_7d', `range=${r.json?.range}`);
  }

  {
    const r = await req('GET', '/api/v1/admin/overview/series?range=30d', {
      token: tok,
    });
    r.status === 200 && r.json?.range === '30d' && r.json?.points?.length === 30
      ? pass('series_30d_ok')
      : fail('series_30d_ok', `status=${r.status}`);
  }

  for (const method of ['POST', 'PATCH', 'DELETE', 'PUT'] as const) {
    const r = await req(method, '/api/v1/admin/overview/series', {
      token: tok,
      body: {},
    });
    r.status === 404 || r.status === 405
      ? pass(`series_no_mutate_${method.toLowerCase()}`)
      : fail(`series_no_mutate_${method.toLowerCase()}`, `status=${r.status}`);
  }

  {
    if (!cleanupUserId) {
      fail('series_user_jwt_blocked', 'no cleanup user');
    } else {
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: cleanupUserId },
      });
      const userTok = jwt.sign(
        { sub: user.id, email: user.email, aud: 'user' },
        process.env.JWT_USER_SECRET!,
        { expiresIn: '1h' },
      );
      const r = await req('GET', '/api/v1/admin/overview/series', {
        token: userTok,
      });
      r.status === 401
        ? pass('series_user_jwt_blocked')
        : fail('series_user_jwt_blocked', `status=${r.status}`);
    }
  }

  {
    const r = await req('GET', '/api/v1/admin/overview/series', {
      token: 'not.a.jwt',
    });
    r.status === 401
      ? pass('series_bad_token_rejected')
      : fail('series_bad_token_rejected', `status=${r.status}`);
  }

  if (cleanupUserId) {
    await prisma.user.deleteMany({ where: { id: cleanupUserId } });
  }

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} passed`);
  await prisma.$disconnect();
  process.exit(failed.length ? 1 : 0);
}

function flattenKeys(obj: unknown, out: Record<string, true> = {}): Record<string, true> {
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    out[k.toLowerCase()] = true;
    if (v && typeof v === 'object') flattenKeys(v, out);
  }
  return out;
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
