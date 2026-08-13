/**
 * Users admin Activity feed (7d) e2e — auth, ACL, counts, order, isolation.
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
  const installId = `e2e-af-install-${stamp}`;

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
      '/api/v1/admin/users/cmsfvv1al0000ny6stysfezh2/activity-feed?days=7',
    );
    r.status === 401
      ? pass('auth_required')
      : fail('auth_required', `status=${r.status}`);
  }

  const noMod = await prisma.admin.create({
    data: {
      email: `e2e.af.nomod.${stamp}@example.com`,
      passwordHash: admin.passwordHash,
      role: 'VIEWER',
      allowedModules: ['overview'],
      isActive: true,
    },
  });
  {
    const r = await req(
      'GET',
      '/api/v1/admin/users/cmsfvv1al0000ny6stysfezh2/activity-feed?days=7',
      { token: adminTok(noMod) },
    );
    r.status === 403
      ? pass('module_acl_blocks')
      : fail('module_acl_blocks', `status=${r.status}`);
  }

  {
    const r = await req(
      'GET',
      '/api/v1/admin/users/bad id!!/activity-feed?days=7',
      { token: tok },
    );
    r.status === 400
      ? pass('reject_bad_user_id')
      : fail('reject_bad_user_id', `status=${r.status}`);
  }

  {
    const r = await req(
      'GET',
      '/api/v1/admin/users/clxxxxxxxxxxxxxxxxxxxxxxxxx/activity-feed?days=7',
      { token: tok },
    );
    r.status === 404
      ? pass('user_not_found')
      : fail('user_not_found', `status=${r.status}`);
  }

  const user = await prisma.user.create({
    data: {
      email: `e2e.af.${stamp}@example.com`,
      displayName: 'AF E2E',
      googleSub: `e2e-af-${stamp}`,
      isActive: true,
    },
  });
  const other = await prisma.user.create({
    data: {
      email: `e2e.af.other.${stamp}@example.com`,
      displayName: 'AF Other',
      googleSub: `e2e-af-other-${stamp}`,
      isActive: true,
    },
  });

  const now = Date.now();
  const mk = (
    userId: string,
    name: string,
    createdAt: Date,
    propsJson?: Record<string, string | number | boolean>,
  ) =>
    prisma.appAnalyticsEvent.create({
      data: {
        name,
        userId,
        installId,
        propsJson: propsJson ?? undefined,
        createdAt,
      },
    });

  await Promise.all([
    mk(user.id, 'app_open', new Date(now - 50_000), { app_version: '1.2.3' }),
    mk(user.id, 'login', new Date(now - 40_000)),
    mk(user.id, 'redeem_claim', new Date(now - 30_000), {
      redeem_id: 'rc_test_abc',
    }),
    mk(user.id, 'scratch_roll', new Date(now - 20_000), { outcome: 'coins' }),
    mk(user.id, 'logout', new Date(now - 10_000)),
    mk(user.id, 'home_open', new Date(now - 5_000)), // excluded from feed
    mk(user.id, 'screen_session', new Date(now - 4_000), {
      screen: 'home',
      duration_ms: 5000,
    }), // excluded
    mk(user.id, 'login', new Date(now - 10 * 24 * 60 * 60 * 1000)), // outside 7d
    mk(other.id, 'logout', new Date(now - 8_000)),
  ]);

  {
    const r = await req(
      'GET',
      `/api/v1/admin/users/${encodeURIComponent(user.id)}/activity-feed?days=7`,
      { token: tok },
    );
    const j = r.json;
    const okShape =
      r.status === 200 &&
      j?.days === 7 &&
      typeof j?.since === 'string' &&
      Array.isArray(j?.items) &&
      j?.summary?.counts;

    okShape ? pass('happy_shape') : fail('happy_shape', JSON.stringify(j));

    j?.summary?.total === 5
      ? pass('summary_total', String(j.summary.total))
      : fail('summary_total', `got=${j?.summary?.total}`);

    const c = j?.summary?.counts ?? {};
    c.app_open === 1 &&
    c.login === 1 &&
    c.redeem_claim === 1 &&
    c.scratch_roll === 1 &&
    c.logout === 1
      ? pass('summary_counts')
      : fail('summary_counts', JSON.stringify(c));

    j?.items?.length === 5
      ? pass('items_count')
      : fail('items_count', `got=${j?.items?.length}`);

    const names = (j?.items ?? []).map((i: { name: string }) => i.name);
    names.join(',') === 'logout,scratch_roll,redeem_claim,login,app_open'
      ? pass('items_newest_first')
      : fail('items_newest_first', names.join(','));

    const claim = (j?.items ?? []).find(
      (i: { name: string }) => i.name === 'redeem_claim',
    );
    claim?.detail === 'rc_test_abc'
      ? pass('claim_detail')
      : fail('claim_detail', JSON.stringify(claim));

    const scratch = (j?.items ?? []).find(
      (i: { name: string }) => i.name === 'scratch_roll',
    );
    scratch?.detail === 'coins'
      ? pass('scratch_detail')
      : fail('scratch_detail', JSON.stringify(scratch));

    const open = (j?.items ?? []).find(
      (i: { name: string }) => i.name === 'app_open',
    );
    open?.detail === 'v1.2.3'
      ? pass('app_open_detail')
      : fail('app_open_detail', JSON.stringify(open));

    !(j?.items ?? []).some((i: { name: string }) => i.name === 'home_open')
      ? pass('excludes_home_open')
      : fail('excludes_home_open');

    !(j?.items ?? []).some((i: { name: string }) => i.name === 'screen_session')
      ? pass('excludes_screen_session')
      : fail('excludes_screen_session');
  }

  {
    const r = await req(
      'GET',
      `/api/v1/admin/users/${encodeURIComponent(user.id)}/activity-feed?days=0`,
      { token: tok },
    );
    r.status === 200 && r.json?.days === 7
      ? pass('days_default_when_invalid')
      : fail('days_default_when_invalid', String(r.json?.days));
  }

  {
    const r = await req(
      'GET',
      `/api/v1/admin/users/${encodeURIComponent(user.id)}/activity-feed?days=99`,
      { token: tok },
    );
    r.status === 200 && r.json?.days === 30
      ? pass('days_clamped_to_30')
      : fail('days_clamped_to_30', String(r.json?.days));
  }

  {
    const r = await req(
      'GET',
      `/api/v1/admin/users/${encodeURIComponent(other.id)}/activity-feed?days=7`,
      { token: tok },
    );
    r.status === 200 &&
    r.json?.summary?.total === 1 &&
    r.json?.items?.[0]?.name === 'logout'
      ? pass('other_user_isolation')
      : fail('other_user_isolation', JSON.stringify(r.json));
  }

  // Client cannot forge login (server-only).
  const userTok = jwt.sign(
    { sub: user.id, email: user.email, aud: 'user', tv: 0 },
    process.env.JWT_USER_SECRET!,
    { expiresIn: '1h' },
  );
  {
    const r = await req('POST', '/api/v1/analytics/events', {
      token: userTok,
      body: {
        name: 'login',
        installId: `dev_${stamp}loginforge000000000`.slice(0, 28),
      },
    });
    r.status === 400
      ? pass('reject_client_login_forge')
      : fail('reject_client_login_forge', `${r.status} ${JSON.stringify(r.json)}`);
  }

  const root = path.join(__dirname, '..', '..');
  const uiFiles = [
    'admin/src/components/users-desk/UsersActivityFeed.tsx',
    'admin/src/components/users-desk/UsersDetailDrawer.tsx',
    'admin/src/components/users-desk/users-api.ts',
    'api/src/users/users-activity-feed.service.ts',
    'api/src/users/users-admin.controller.ts',
  ];
  let uiOk = true;
  for (const rel of uiFiles) {
    const full = path.join(root, rel);
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
  drawer.includes('UsersActivityFeed') && drawer.includes('userId={row.id}')
    ? pass('drawer_wires_activity_feed')
    : fail('drawer_wires_activity_feed');

  await prisma.appAnalyticsEvent.deleteMany({ where: { installId } });
  await prisma.user.deleteMany({ where: { id: { in: [user.id, other.id] } } });
  await prisma.admin.deleteMany({ where: { id: noMod.id } });
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
