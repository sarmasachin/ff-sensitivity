/**
 * Promos admin + live catalog e2e / security (local Postgres).
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

function windowStamps() {
  const start = new Date();
  start.setDate(start.getDate() - 2);
  const end = new Date();
  end.setDate(end.getDate() + 10);
  const futureStart = new Date();
  futureStart.setDate(futureStart.getDate() + 3);
  const futureEnd = new Date();
  futureEnd.setDate(futureEnd.getDate() + 20);
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return {
    startsAt: fmt(start),
    endsAt: fmt(end),
    futureStartsAt: fmt(futureStart),
    futureEndsAt: fmt(futureEnd),
  };
}

async function main() {
  loadEnv();
  const adminEmail = process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';
  const adminPassword = process.env.SUPERADMIN_PASSWORD ?? '123456';
  const { startsAt, endsAt, futureStartsAt, futureEndsAt } = windowStamps();

  {
    const r = await req('GET', '/api/v1/promos/live');
    r.status === 200 && Array.isArray(r.json?.promos)
      ? pass('public_live', `count=${r.json.promos.length}`)
      : fail('public_live', `status=${r.status}`);
  }

  {
    const r = await req('GET', '/api/v1/admin/promos');
    r.status === 401
      ? pass('admin_auth_required')
      : fail('admin_auth_required', `status=${r.status}`);
  }

  const login = await req('POST', '/api/v1/auth/login', {
    body: { email: adminEmail, password: adminPassword },
  });
  const adminTok = login.json?.accessToken as string | undefined;
  adminTok ? pass('admin_login') : fail('admin_login');

  const good = {
    promos: [
      {
        id: 'e2e_banner',
        title: 'E2E Banner',
        subtitle: 'Live window',
        imageLabel: 'e2e-banner',
        deepLink: 'ffops://challenge',
        placement: 'HOME_BANNER',
        sortOrder: 1,
        enabled: true,
        startsAt,
        endsAt,
      },
      {
        id: 'e2e_off',
        title: 'E2E Off',
        subtitle: 'Disabled',
        imageLabel: 'e2e-off',
        deepLink: 'ffops://home',
        placement: 'HOME_STRIP',
        sortOrder: 2,
        enabled: false,
        startsAt,
        endsAt,
      },
      {
        id: 'e2e_ended',
        title: 'E2E Ended',
        subtitle: 'Past window',
        imageLabel: 'e2e-ended',
        deepLink: 'ffops://shop',
        placement: 'HOME_BANNER',
        sortOrder: 3,
        enabled: true,
        startsAt: '2020-01-01 00:00',
        endsAt: '2020-01-02 00:00',
      },
      {
        id: 'e2e_scheduled',
        title: 'E2E Scheduled',
        subtitle: 'Future window',
        imageLabel: 'e2e-sched',
        deepLink: 'ffops://redeem',
        placement: 'HOME_STRIP',
        sortOrder: 4,
        enabled: true,
        startsAt: futureStartsAt,
        endsAt: futureEndsAt,
      },
    ],
  };

  {
    const r = await req('PUT', '/api/v1/admin/promos', {
      token: adminTok,
      body: good,
    });
    r.status === 200 && r.json?.promos?.length === 4
      ? pass('admin_save')
      : fail('admin_save', `status=${r.status}`);
  }

  {
    const r = await req('GET', '/api/v1/promos/live');
    const ids = (r.json?.promos ?? []).map((p: any) => p.id);
    const leaked = (r.json?.promos ?? []).some(
      (p: any) =>
        p.startsAt !== undefined ||
        p.endsAt !== undefined ||
        p.enabled !== undefined,
    );
    ids.includes('e2e_banner') &&
    !ids.includes('e2e_off') &&
    !ids.includes('e2e_ended') &&
    !ids.includes('e2e_scheduled') &&
    !leaked
      ? pass('live_filters_schedule')
      : fail('live_filters_schedule', JSON.stringify(ids));
  }

  {
    const r = await req('PUT', '/api/v1/admin/promos', {
      token: adminTok,
      body: {
        promos: [
          {
            ...good.promos[0],
            deepLink: 'ffops://user:pass@home',
          },
        ],
      },
    });
    r.status === 400
      ? pass('reject_deeplink_credentials')
      : fail('reject_deeplink_credentials', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/promos', {
      token: adminTok,
      body: {
        promos: [
          {
            ...good.promos[0],
            deepLink: 'https://evil.example/phish',
          },
        ],
      },
    });
    r.status === 400
      ? pass('reject_https_deeplink')
      : fail('reject_https_deeplink', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/promos', {
      token: adminTok,
      body: {
        promos: [
          {
            ...good.promos[0],
            deepLink: 'javascript:alert(1)',
          },
        ],
      },
    });
    r.status === 400
      ? pass('reject_js_deeplink')
      : fail('reject_js_deeplink', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/promos', {
      token: adminTok,
      body: {
        promos: [
          {
            ...good.promos[0],
            deepLink: 'ffops://not_a_real_route',
          },
        ],
      },
    });
    r.status === 400
      ? pass('reject_unknown_path')
      : fail('reject_unknown_path', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/promos', {
      token: adminTok,
      body: {
        promos: [
          {
            ...good.promos[0],
            startsAt: endsAt,
            endsAt: startsAt,
          },
        ],
      },
    });
    r.status === 400
      ? pass('reject_bad_window')
      : fail('reject_bad_window', `status=${r.status}`);
  }

  const noPromos = await prisma.admin.upsert({
    where: { email: 'e2e.nopromos@example.com' },
    update: {
      isActive: true,
      allowedModules: ['community'],
      role: 'ADMIN',
      mustChangePassword: false,
    },
    create: {
      email: 'e2e.nopromos@example.com',
      passwordHash: '$2b$10$invalidhashfortestsonlyxxxxxx',
      role: 'ADMIN',
      isActive: true,
      allowedModules: ['community'],
      mustChangePassword: false,
    },
  });
  const noTok = jwt.sign(
    { sub: noPromos.id, email: noPromos.email, role: 'ADMIN' },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: '1h' },
  );
  {
    const r = await req('GET', '/api/v1/admin/promos', { token: noTok });
    r.status === 403
      ? pass('module_guard_403')
      : fail('module_guard_403', `status=${r.status}`);
  }

  const appUser = await prisma.user.upsert({
    where: { email: 'e2e.promos.app@example.com' },
    update: { isActive: true },
    create: {
      googleSub: 'e2e-promos-app',
      email: 'e2e.promos.app@example.com',
      displayName: 'Promos App',
      isActive: true,
    },
  });
  const userTok = jwt.sign(
    { sub: appUser.id, email: appUser.email, aud: 'user' },
    process.env.JWT_USER_SECRET!,
    { expiresIn: '1h' },
  );
  {
    const r = await req('GET', '/api/v1/admin/promos', { token: userTok });
    r.status === 401
      ? pass('user_jwt_blocked_on_admin')
      : fail('user_jwt_blocked_on_admin', `status=${r.status}`);
  }

  // Restore seed-like live set
  await req('PUT', '/api/v1/admin/promos', {
    token: adminTok,
    body: {
      promos: [
        {
          id: 'promo_challenge_week',
          title: 'Daily Challenge week',
          subtitle: 'Complete quizzes for bonus coins.',
          imageLabel: 'challenge-hero',
          deepLink: 'ffops://challenge',
          placement: 'HOME_BANNER',
          sortOrder: 1,
          enabled: true,
          startsAt,
          endsAt,
        },
        {
          id: 'promo_scratch_boost',
          title: 'Scratch boost',
          subtitle: 'Open your daily scratch after check-in.',
          imageLabel: 'scratch-gold',
          deepLink: 'ffops://scratch',
          placement: 'HOME_BANNER',
          sortOrder: 2,
          enabled: true,
          startsAt,
          endsAt,
        },
      ],
    },
  });
  pass('restore_catalog');

  const ok = checks.filter((c) => c.ok).length;
  console.log(`\n${ok}/${checks.length} passed`);
  await prisma.$disconnect();
  process.exit(ok === checks.length ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
