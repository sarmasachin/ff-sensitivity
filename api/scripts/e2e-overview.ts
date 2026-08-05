/**
 * Overview KPIs admin e2e (local Postgres).
 */
import { PrismaClient, AdminRole, AdminModule } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
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

function shapeOk(j: any): boolean {
  return (
    j &&
    typeof j.users?.total === 'number' &&
    typeof j.users?.newToday === 'number' &&
    typeof j.users?.new7d === 'number' &&
    typeof j.users?.active === 'number' &&
    typeof j.users?.restricted === 'number' &&
    typeof j.users?.suspended === 'number' &&
    typeof j.users?.loggedIn7d === 'number' &&
    typeof j.devices?.total === 'number' &&
    typeof j.devices?.active72h === 'number' &&
    typeof j.devices?.stale === 'number' &&
    typeof j.devices?.blocked === 'number' &&
    typeof j.devices?.pushActive7d === 'number' &&
    typeof j.redeem?.activeCodes === 'number' &&
    typeof j.redeem?.lowStock === 'number' &&
    typeof j.today?.claims === 'number' &&
    typeof j.today?.scratch === 'number' &&
    typeof j.today?.walletNet === 'number' &&
    typeof j.today?.pendingSupport === 'number' &&
    typeof j.engagement?.dauToday === 'number' &&
    typeof j.engagement?.mau30d === 'number' &&
    typeof j.engagement?.eventsToday === 'number' &&
    typeof j.engagement?.logoutToday === 'number' &&
    Array.isArray(j.engagement?.topEvents) &&
    typeof j.funnel?.installsToday === 'number' &&
    typeof j.funnel?.firstOpenToday === 'number' &&
    typeof j.funnel?.signupsToday === 'number' &&
    typeof j.funnel?.firstClaimsToday === 'number' &&
    typeof j.p3?.screenTime?.trackedUsersToday === 'number' &&
    typeof j.p3?.screenTime?.screenVisitsToday === 'number' &&
    typeof j.p3?.screenTime?.screenTimeTodaySeconds === 'number' &&
    typeof j.p3?.screenTime?.avgScreenSeconds === 'number' &&
    Array.isArray(j.p3?.screenTime?.topScreens) &&
    typeof j.p3?.installHealth?.suspectedUninstalls === 'number' &&
    typeof j.p3?.installHealth?.registeredWithoutOpenEvent === 'number' &&
    typeof j.p3?.installHealth?.stale72h === 'number' &&
    j.p3?.crashReporting?.provider === 'firebase_crashlytics' &&
    j.p3?.crashReporting?.liveKpiAvailable === false &&
    typeof j.meta?.staleHours === 'number' &&
    typeof j.refreshedAt === 'string'
  );
}

async function main() {
  loadEnv();
  const adminEmail = process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';
  const adminPassword = process.env.SUPERADMIN_PASSWORD ?? '123456';
  const stamp = Date.now().toString(36);
  const cleanupEmails: string[] = [];

  {
    const r = await req('GET', '/api/v1/admin/overview');
    r.status === 401
      ? pass('admin_auth_required')
      : fail('admin_auth_required', `status=${r.status}`);
  }

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

  {
    const r = await req('GET', '/api/v1/admin/overview', { token: tok });
    if (r.status === 200 && shapeOk(r.json)) {
      pass(
        'admin_snapshot',
        `users=${r.json.users.total} devices=${r.json.devices.total}`,
      );
    } else {
      fail('admin_snapshot', `status=${r.status}`);
    }
  }

  function seriesShapeOk(j: any, range: string): boolean {
    return (
      j &&
      j.range === range &&
      j.dayBasis === 'utc' &&
      Array.isArray(j.points) &&
      j.points.length === (range === '30d' ? 30 : 7) &&
      j.points.every(
        (p: any) =>
          typeof p.day === 'string' &&
          typeof p.label === 'string' &&
          typeof p.dau === 'number' &&
          typeof p.claims === 'number' &&
          typeof p.signups === 'number' &&
          typeof p.screenVisits === 'number',
      ) &&
      typeof j.funnel?.installs === 'number' &&
      typeof j.funnel?.firstOpen === 'number' &&
      typeof j.funnel?.signups === 'number' &&
      typeof j.funnel?.firstClaims === 'number' &&
      Array.isArray(j.topScreens) &&
      typeof j.refreshedAt === 'string'
    );
  }

  {
    const r = await req('GET', '/api/v1/admin/overview/series', { token: tok });
    r.status === 200 && seriesShapeOk(r.json, '7d')
      ? pass('admin_series_default_7d', `points=${r.json.points.length}`)
      : fail('admin_series_default_7d', `status=${r.status}`);
  }

  {
    const r = await req('GET', '/api/v1/admin/overview/series?range=30d', {
      token: tok,
    });
    r.status === 200 && seriesShapeOk(r.json, '30d')
      ? pass('admin_series_30d', `points=${r.json.points.length}`)
      : fail('admin_series_30d', `status=${r.status}`);
  }

  {
    const r = await req('GET', '/api/v1/admin/overview/series');
    r.status === 401
      ? pass('series_auth_required')
      : fail('series_auth_required', `status=${r.status}`);
  }

  for (const method of ['POST', 'PATCH', 'DELETE', 'PUT'] as const) {
    const r = await req(method, '/api/v1/admin/overview', {
      token: tok,
      body: {},
    });
    r.status === 404 || r.status === 405
      ? pass(`no_mutate_${method.toLowerCase()}`)
      : fail(`no_mutate_${method.toLowerCase()}`, `status=${r.status}`);
  }

  {
    const dbUsers = await prisma.user.count();
    const r = await req('GET', '/api/v1/admin/overview', { token: tok });
    r.status === 200 && r.json?.users?.total === dbUsers
      ? pass('users_total_matches_db', `n=${dbUsers}`)
      : fail(
          'users_total_matches_db',
          `api=${r.json?.users?.total} db=${dbUsers}`,
        );
  }

  {
    const dbDevices = await prisma.deviceInstall.count();
    const r = await req('GET', '/api/v1/admin/overview', { token: tok });
    r.status === 200 && r.json?.devices?.total === dbDevices
      ? pass('devices_total_matches_db', `n=${dbDevices}`)
      : fail(
          'devices_total_matches_db',
          `api=${r.json?.devices?.total} db=${dbDevices}`,
        );
  }

  const deniedEmail = `e2e.overview.denied.${stamp}@example.com`;
  cleanupEmails.push(deniedEmail);
  {
    const hash = await bcrypt.hash('OverviewE2e!23456', 10);
    await prisma.admin.create({
      data: {
        email: deniedEmail,
        passwordHash: hash,
        role: AdminRole.VIEWER,
        allowedModules: [AdminModule.support],
        isActive: true,
        mustChangePassword: false,
      },
    });
    const vLogin = await req('POST', '/api/v1/auth/login', {
      body: { email: deniedEmail, password: 'OverviewE2e!23456' },
    });
    const vTok = vLogin.json?.accessToken as string | undefined;
    if (!vTok) {
      fail('any_seat_can_read_home');
    } else {
      const r = await req('GET', '/api/v1/admin/overview', { token: vTok });
      r.status === 200 && shapeOk(r.json)
        ? pass('any_seat_can_read_home')
        : fail('any_seat_can_read_home', `status=${r.status}`);
    }
  }

  const viewerEmail = `e2e.overview.viewer.${stamp}@example.com`;
  cleanupEmails.push(viewerEmail);
  {
    const hash = await bcrypt.hash('OverviewE2e!23456', 10);
    await prisma.admin.create({
      data: {
        email: viewerEmail,
        passwordHash: hash,
        role: AdminRole.VIEWER,
        allowedModules: [AdminModule.overview],
        isActive: true,
        mustChangePassword: false,
      },
    });
    const vLogin = await req('POST', '/api/v1/auth/login', {
      body: { email: viewerEmail, password: 'OverviewE2e!23456' },
    });
    const vTok = vLogin.json?.accessToken as string | undefined;
    if (!vTok) {
      fail('viewer_can_read');
    } else {
      const r = await req('GET', '/api/v1/admin/overview', { token: vTok });
      r.status === 200 && shapeOk(r.json)
        ? pass('viewer_can_read')
        : fail('viewer_can_read', `status=${r.status}`);
    }
  }

  for (const email of cleanupEmails) {
    await prisma.admin.deleteMany({ where: { email } });
  }

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} passed`);
  await prisma.$disconnect();
  process.exit(failed.length ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
