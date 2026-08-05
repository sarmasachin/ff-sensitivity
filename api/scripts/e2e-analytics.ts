/**
 * App analytics ingest + engagement e2e (local Postgres).
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

async function main() {
  loadEnv();
  const adminEmail = process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';
  const adminPassword = process.env.SUPERADMIN_PASSWORD ?? '123456';
  const stamp = Date.now().toString(36);
  const installId = `dev_${stamp}analytics000000`.slice(0, 28);
  let cleanupUserId: string | null = null;

  {
    const r = await req('POST', '/api/v1/analytics/events', {
      body: { name: 'home_open', installId },
    });
    r.status === 401
      ? pass('events_auth_required')
      : fail('events_auth_required', `status=${r.status}`);
  }

  {
    const r = await req('POST', '/api/v1/analytics/anon-open', {
      body: { installId, appVersion: '1.0.0-e2e' },
    });
    r.status === 201 || r.status === 200
      ? pass('anon_open_ok')
      : fail('anon_open_ok', `status=${r.status}`);
  }

  {
    const r = await req('POST', '/api/v1/analytics/anon-open', {
      body: { installId: 'bad', appVersion: '1' },
    });
    r.status === 400
      ? pass('anon_bad_install')
      : fail('anon_bad_install', `status=${r.status}`);
  }

  const user = await prisma.user.create({
    data: {
      googleSub: `e2e-analytics-${stamp}`,
      email: `e2e.analytics.${stamp}@example.com`,
      displayName: 'Analytics E2E',
      isActive: true,
      coins: 0,
    },
  });
  cleanupUserId = user.id;
  const userTok = jwt.sign(
    { sub: user.id, email: user.email, aud: 'user', tv: 0 },
    process.env.JWT_USER_SECRET!,
    { expiresIn: '1h' },
  );
  await prisma.deviceInstall.create({
    data: {
      installId,
      userId: user.id,
      brand: 'E2E',
      model: 'Analytics',
      androidVersion: '14',
      appVersion: '1.0.0-e2e',
      appVersionCode: 1,
    },
  });

  {
    const r = await req('POST', '/api/v1/analytics/events', {
      token: userTok,
      body: {
        name: 'home_open',
        installId,
        props: { email: 'leak@x.com', token: 'secret', screen: 'home' },
      },
    });
    if (r.status === 200 || r.status === 201) {
      const row = await prisma.appAnalyticsEvent.findFirst({
        where: { userId: user.id, name: 'home_open' },
        orderBy: { createdAt: 'desc' },
      });
      const props = (row?.propsJson ?? {}) as Record<string, unknown>;
      const safe =
        !('email' in props) && !('token' in props) && props.screen === 'home';
      safe
        ? pass('track_strips_secrets')
        : fail('track_strips_secrets', JSON.stringify(props));
    } else {
      fail('track_strips_secrets', `status=${r.status}`);
    }
  }

  // --- Start: App analytics P3 screen time (Sachin) ---
  {
    const r = await req('POST', '/api/v1/analytics/events', {
      token: userTok,
      body: {
        name: 'screen_session',
        installId,
        props: {
          screen: 'home',
          duration_ms: 12_345,
          email: 'must-not-store@example.com',
        },
      },
    });
    const row = await prisma.appAnalyticsEvent.findFirst({
      where: { userId: user.id, name: 'screen_session' },
      orderBy: { createdAt: 'desc' },
    });
    const props = (row?.propsJson ?? {}) as Record<string, unknown>;
    (r.status === 200 || r.status === 201) &&
    props.screen === 'home' &&
    props.duration_ms === 12_345 &&
    !('email' in props)
      ? pass('screen_session_bounded_shape')
      : fail(
          'screen_session_bounded_shape',
          `status=${r.status} props=${JSON.stringify(props)}`,
        );
  }

  {
    const r = await req('POST', '/api/v1/analytics/events', {
      token: userTok,
      body: {
        name: 'screen_session',
        installId,
        props: { screen: 'home', duration_ms: 1_800_001 },
      },
    });
    r.status === 400 && r.json?.error?.code === 'ANALYTICS_BAD_DURATION'
      ? pass('reject_oversized_screen_duration')
      : fail(
          'reject_oversized_screen_duration',
          `status=${r.status} body=${JSON.stringify(r.json)}`,
        );
  }

  {
    const foreignInstall =
      `dev_${stamp}foreignscreen000000`.slice(0, 28);
    const r = await req('POST', '/api/v1/analytics/events', {
      token: userTok,
      body: {
        name: 'screen_session',
        installId: foreignInstall,
        props: { screen: 'home', duration_ms: 5_000 },
      },
    });
    r.status === 403 &&
    r.json?.error?.code === 'ANALYTICS_INSTALL_UNVERIFIED'
      ? pass('reject_unregistered_screen_install')
      : fail(
          'reject_unregistered_screen_install',
          `status=${r.status} body=${JSON.stringify(r.json)}`,
        );
  }
  // --- End: App analytics P3 screen time (Sachin) ---

  {
    const r = await req('POST', '/api/v1/analytics/events', {
      token: userTok,
      body: { name: 'hack_drop_table', installId },
    });
    r.status === 400
      ? pass('reject_unknown_event')
      : fail('reject_unknown_event', `status=${r.status}`);
  }

  {
    const r = await req('POST', '/api/v1/analytics/events', {
      token: userTok,
      body: { name: 'redeem_claim', installId },
    });
    r.status === 400
      ? pass('reject_client_feature_forge')
      : fail('reject_client_feature_forge', `status=${r.status}`);
  }

  {
    const r = await req('POST', '/api/v1/analytics/events', {
      token: userTok,
      body: { name: 'logout', installId },
    });
    const code = r.json?.error?.code;
    r.status === 400 && code === 'ANALYTICS_SERVER_ONLY'
      ? pass('reject_client_logout_forge')
      : fail(
          'reject_client_logout_forge',
          `status=${r.status} body=${JSON.stringify(r.json)}`,
        );
  }

  // --- Start: App analytics P2 logout revoke (Sachin) ---
  {
    const r = await req('POST', '/api/v1/user/auth/logout', {
      token: userTok,
      body: { installId },
    });
    r.status === 200 || r.status === 201
      ? pass('server_logout_ok')
      : fail('server_logout_ok', `status=${r.status}`);
  }

  {
    // trackSafe is fire-and-forget — give the write a moment to land.
    let row = null as { id: string } | null;
    for (let i = 0; i < 10 && !row; i += 1) {
      await new Promise((r) => setTimeout(r, 150));
      row = await prisma.appAnalyticsEvent.findFirst({
        where: { userId: user.id, name: 'logout' },
        select: { id: true },
      });
    }
    row
      ? pass('server_logout_records_event')
      : fail('server_logout_records_event', 'no logout row for user');
  }

  {
    const r = await req('POST', '/api/v1/analytics/events', {
      token: userTok,
      body: { name: 'home_open', installId },
    });
    const code = r.json?.error?.code ?? r.json?.code;
    r.status === 401 && (code === 'AUTH_REVOKED' || code === 'AUTH_INVALID')
      ? pass('logout_revokes_jwt', `code=${code}`)
      : fail(
          'logout_revokes_jwt',
          `status=${r.status} body=${JSON.stringify(r.json)}`,
        );
  }
  // --- End: App analytics P2 logout revoke (Sachin) ---

  const login = await req('POST', '/api/v1/auth/login', {
    body: { email: adminEmail, password: adminPassword },
  });
  const tok = login.json?.accessToken as string | undefined;
  if (!tok) {
    fail('admin_login');
  } else {
    pass('admin_login');
    const o = await req('GET', '/api/v1/admin/overview', { token: tok });
    const eng = o.json?.engagement;
    const funnel = o.json?.funnel;
    const p3 = o.json?.p3;
    o.status === 200 &&
    typeof eng?.dauToday === 'number' &&
    eng.dauToday >= 1 &&
    typeof eng?.eventsToday === 'number' &&
    eng.eventsToday >= 1
      ? pass('overview_engagement', `dau=${eng.dauToday} events=${eng.eventsToday}`)
      : fail('overview_engagement', JSON.stringify(eng));
    o.status === 200 &&
    typeof funnel?.installsToday === 'number' &&
    typeof funnel?.firstOpenToday === 'number' &&
    typeof funnel?.signupsToday === 'number' &&
    typeof funnel?.firstClaimsToday === 'number' &&
    funnel.firstOpenToday >= 1 &&
    funnel.signupsToday >= 1
      ? pass(
          'overview_funnel',
          `open=${funnel.firstOpenToday} signup=${funnel.signupsToday}`,
        )
      : fail('overview_funnel', JSON.stringify(funnel));
    o.status === 200 &&
    typeof p3?.screenTime?.screenTimeTodaySeconds === 'number' &&
    p3.screenTime.screenTimeTodaySeconds >= 12 &&
    typeof p3?.installHealth?.suspectedUninstalls === 'number' &&
    typeof p3?.installHealth?.registeredWithoutOpenEvent === 'number' &&
    p3?.crashReporting?.provider === 'firebase_crashlytics' &&
    p3?.crashReporting?.liveKpiAvailable === false
      ? pass(
          'overview_p3_quality',
          `screenSeconds=${p3.screenTime.screenTimeTodaySeconds}`,
        )
      : fail('overview_p3_quality', JSON.stringify(p3));
  }

  await prisma.appAnalyticsEvent.deleteMany({
    where: {
      OR: [{ installId }, { userId: user.id }],
    },
  });
  await prisma.deviceInstall.deleteMany({ where: { installId } });
  if (cleanupUserId) {
    await prisma.user.deleteMany({ where: { id: cleanupUserId } });
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
