/**
 * Users admin Screen journey (7d) e2e — auth, ACL, math, clamp, isolation.
 */
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';

const API = process.env.API_BASE ?? 'http://127.0.0.1:4000';
const prisma = new PrismaClient();
const SCREEN_SESSION_MAX_MS = 30 * 60 * 1000;

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

function adminTok(admin: { id: string; email: string; role: string }) {
  return jwt.sign(
    { sub: admin.id, email: admin.email, role: admin.role },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: '20m' },
  );
}

async function main() {
  loadEnv();
  const stamp = Date.now().toString(36);
  const email = `e2e.sj.${stamp}@example.com`;
  const otherEmail = `e2e.sj.other.${stamp}@example.com`;

  const admin = await prisma.admin.findFirst({
    where: { role: 'SUPER_ADMIN', isActive: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!admin || !process.env.JWT_ACCESS_SECRET) {
    fail('superadmin_bootstrap');
    await prisma.$disconnect();
    process.exit(1);
  }
  pass('superadmin_bootstrap');
  const tok = adminTok(admin);

  {
    const r = await req(
      'GET',
      '/api/v1/admin/users/cmsfvv1al0000ny6stysfezh2/screen-journey?days=7',
    );
    r.status === 401
      ? pass('auth_required')
      : fail('auth_required', `status=${r.status}`);
  }

  const noMod = await prisma.admin.create({
    data: {
      email: `e2e.sj.nomod.${stamp}@example.com`,
      passwordHash: admin.passwordHash,
      role: 'VIEWER',
      allowedModules: ['overview'],
      isActive: true,
    },
  });
  {
    const r = await req(
      'GET',
      `/api/v1/admin/users/cmsfvv1al0000ny6stysfezh2/screen-journey?days=7`,
      { token: adminTok(noMod) },
    );
    r.status === 403
      ? pass('module_acl_blocks')
      : fail('module_acl_blocks', `status=${r.status} ${JSON.stringify(r.json)}`);
  }

  const withUsers = await prisma.admin.create({
    data: {
      email: `e2e.sj.viewer.${stamp}@example.com`,
      passwordHash: admin.passwordHash,
      role: 'VIEWER',
      allowedModules: ['users'],
      isActive: true,
    },
  });
  const viewerTok = adminTok(withUsers);

  {
    const r = await req(
      'GET',
      '/api/v1/admin/users/bad id!!/screen-journey?days=7',
      { token: tok },
    );
    r.status === 400
      ? pass('reject_bad_user_id')
      : fail('reject_bad_user_id', `status=${r.status}`);
  }

  {
    const r = await req(
      'GET',
      '/api/v1/admin/users/clxxxxxxxxxxxxxxxxxxxxxxxxx/screen-journey?days=7',
      { token: tok },
    );
    r.status === 404
      ? pass('user_not_found')
      : fail('user_not_found', `status=${r.status}`);
  }

  const user = await prisma.user.create({
    data: {
      email,
      displayName: 'SJ E2E',
      googleSub: `e2e-sj-${stamp}`,
      isActive: true,
      coins: 0,
    },
  });
  const other = await prisma.user.create({
    data: {
      email: otherEmail,
      displayName: 'SJ Other',
      googleSub: `e2e-sj-other-${stamp}`,
      isActive: true,
      coins: 0,
    },
  });

  const now = Date.now();
  const mk = (
    userId: string,
    screen: string,
    durationMs: number,
    createdAt: Date,
  ) =>
    prisma.appAnalyticsEvent.create({
      data: {
        name: 'screen_session',
        userId,
        installId: `e2e-sj-install-${stamp}`,
        propsJson: { screen, duration_ms: durationMs },
        createdAt,
      },
    });

  await Promise.all([
    mk(user.id, 'home', 5_000, new Date(now - 60_000)),
    mk(user.id, 'home', 7_000, new Date(now - 120_000)),
    mk(user.id, 'redeem', 12_000, new Date(now - 30_000)),
    mk(user.id, 'shop', 90 * 60 * 1000, new Date(now - 10_000)), // over max → capped
    mk(user.id, 'home', 4_000, new Date(now - 10 * 24 * 60 * 60 * 1000)), // outside 7d
    mk(other.id, 'home', 50_000, new Date(now - 20_000)), // other user isolation
  ]);

  {
    const r = await req(
      'GET',
      `/api/v1/admin/users/${encodeURIComponent(user.id)}/screen-journey?days=7`,
      { token: tok },
    );
    const j = r.json;
    const okShape =
      r.status === 200 &&
      j?.days === 7 &&
      typeof j?.since === 'string' &&
      Array.isArray(j?.byScreen) &&
      Array.isArray(j?.timeline) &&
      j?.summary;

    if (!okShape) {
      fail('happy_shape', `${r.status} ${JSON.stringify(j)}`);
    } else {
      pass('happy_shape');
    }

    // 3 in-window valid + 1 capped shop (home×2, redeem, shop). Old home excluded.
    // over-max still counts as a visit.
    const expectedVisits = 4;
    const expectedTotalSeconds =
      Math.round(5_000 / 1000) +
      Math.round(7_000 / 1000) +
      Math.round(12_000 / 1000) +
      Math.round(SCREEN_SESSION_MAX_MS / 1000);

    j?.summary?.visits === expectedVisits
      ? pass('summary_visits', String(j.summary.visits))
      : fail(
          'summary_visits',
          `got=${j?.summary?.visits} want=${expectedVisits}`,
        );

    j?.summary?.totalSeconds === expectedTotalSeconds
      ? pass('summary_total_seconds', String(j.summary.totalSeconds))
      : fail(
          'summary_total_seconds',
          `got=${j?.summary?.totalSeconds} want=${expectedTotalSeconds}`,
        );

    j?.summary?.uniqueScreens === 3
      ? pass('summary_unique_screens')
      : fail(
          'summary_unique_screens',
          `got=${j?.summary?.uniqueScreens}`,
        );

    const top = j?.byScreen?.[0];
    top?.screen === 'shop' && top?.seconds === Math.round(SCREEN_SESSION_MAX_MS / 1000)
      ? pass('by_screen_capped_top')
      : fail('by_screen_capped_top', JSON.stringify(j?.byScreen?.[0]));

    const home = (j?.byScreen ?? []).find(
      (row: { screen: string }) => row.screen === 'home',
    );
    home?.visits === 2 && home?.seconds === 12
      ? pass('by_screen_home_aggregate')
      : fail('by_screen_home_aggregate', JSON.stringify(home));

    j?.timeline?.length === 4
      ? pass('timeline_count', String(j.timeline.length))
      : fail('timeline_count', `got=${j?.timeline?.length}`);

    const orderOk =
      j?.timeline?.[0]?.screen === 'shop' &&
      j?.timeline?.[1]?.screen === 'redeem' &&
      j?.timeline?.[2]?.screen === 'home' &&
      j?.timeline?.[3]?.screen === 'home';
    orderOk
      ? pass('timeline_newest_first')
      : fail(
          'timeline_newest_first',
          (j?.timeline ?? []).map((t: { screen: string }) => t.screen).join(','),
        );

    j?.timeline?.[0]?.durationMs === SCREEN_SESSION_MAX_MS &&
    j?.timeline?.[0]?.seconds === Math.round(SCREEN_SESSION_MAX_MS / 1000)
      ? pass('timeline_duration_capped')
      : fail('timeline_duration_capped', JSON.stringify(j?.timeline?.[0]));

    const leaked = (j?.timeline ?? []).some(
      (t: { screen: string; seconds: number }) =>
        t.screen === 'home' && t.seconds === 50,
    );
    !leaked
      ? pass('no_other_user_leak')
      : fail('no_other_user_leak');
  }

  {
    const r = await req(
      'GET',
      `/api/v1/admin/users/${encodeURIComponent(user.id)}/screen-journey?days=0`,
      { token: tok },
    );
    r.status === 200 && r.json?.days === 7
      ? pass('days_default_when_invalid')
      : fail('days_default_when_invalid', JSON.stringify(r.json?.days));
  }

  {
    const r = await req(
      'GET',
      `/api/v1/admin/users/${encodeURIComponent(user.id)}/screen-journey?days=99`,
      { token: tok },
    );
    r.status === 200 && r.json?.days === 30
      ? pass('days_clamped_to_30')
      : fail('days_clamped_to_30', JSON.stringify(r.json?.days));
  }

  {
    const r = await req(
      'GET',
      `/api/v1/admin/users/${encodeURIComponent(user.id)}/screen-journey?days=7`,
      { token: viewerTok },
    );
    r.status === 200 && r.json?.summary?.visits === 4
      ? pass('viewer_with_users_module_can_read')
      : fail(
          'viewer_with_users_module_can_read',
          `${r.status} ${JSON.stringify(r.json?.summary)}`,
        );
  }

  {
    const r = await req(
      'GET',
      `/api/v1/admin/users/${encodeURIComponent(other.id)}/screen-journey?days=7`,
      { token: tok },
    );
    r.status === 200 &&
    r.json?.summary?.visits === 1 &&
    r.json?.timeline?.[0]?.screen === 'home' &&
    r.json?.timeline?.[0]?.seconds === 50
      ? pass('other_user_isolation_ok')
      : fail('other_user_isolation_ok', JSON.stringify(r.json));
  }

  // Admin UI wire static checks (files must stay under 400 lines).
  const root = path.join(__dirname, '..', '..');
  const uiFiles = [
    'admin/src/components/users-desk/UsersScreenJourney.tsx',
    'admin/src/components/users-desk/UsersDetailDrawer.tsx',
    'admin/src/components/users-desk/users-api.ts',
    'api/src/users/users-screen-journey.service.ts',
    'api/src/users/users-admin.controller.ts',
  ];
  let uiOk = true;
  for (const rel of uiFiles) {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) {
      uiOk = false;
      fail('ui_file_exists', rel);
      continue;
    }
    const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/).length;
    if (lines > 400) {
      uiOk = false;
      fail('ui_file_under_400', `${rel} lines=${lines}`);
    }
  }
  if (uiOk) pass('ui_files_under_400');

  const drawer = fs.readFileSync(
    path.join(root, 'admin/src/components/users-desk/UsersDetailDrawer.tsx'),
    'utf8',
  );
  drawer.includes('UsersScreenJourney') && drawer.includes('userId={row.id}')
    ? pass('drawer_wires_screen_journey')
    : fail('drawer_wires_screen_journey');

  const apiTs = fs.readFileSync(
    path.join(root, 'admin/src/components/users-desk/users-api.ts'),
    'utf8',
  );
  apiTs.includes('/screen-journey?days=')
    ? pass('admin_client_path')
    : fail('admin_client_path');

  // Cleanup e2e rows
  await prisma.appAnalyticsEvent.deleteMany({
    where: { installId: `e2e-sj-install-${stamp}` },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [user.id, other.id] } },
  });
  await prisma.admin.deleteMany({
    where: { id: { in: [noMod.id, withUsers.id] } },
  });
  pass('cleanup');

  const failed = checks.filter((c) => !c.ok);
  console.log(
    `\nRESULT  ${checks.length - failed.length}/${checks.length} passed`,
  );
  await prisma.$disconnect();
  process.exit(failed.length ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
