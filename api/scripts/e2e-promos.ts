/**
 * Promos admin + live catalog e2e / security (local Postgres).
 */
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import { runPromoPersistChecks } from './e2e-promos-crud';
import {
  checks,
  fail,
  loadEnv,
  mintSuperToken,
  pass,
  prisma,
  req,
  restorePromos,
  windowStamps,
} from './e2e-promos-lib';

async function main() {
  loadEnv();
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

  const adminTok = await mintSuperToken();
  if (!adminTok) {
    fail('super_login', 'active admin not found');
    console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} passed`);
    await prisma.$disconnect();
    process.exit(1);
  }
  pass('super_login', 'minted jwt');

  const snapshot = await req('GET', '/api/v1/admin/promos', { token: adminTok });
  snapshot.status === 200 && Array.isArray(snapshot.json?.promos)
    ? pass('admin_get', `count=${snapshot.json.promos.length}`)
    : fail('admin_get', `status=${snapshot.status}`);
  const snapshotPromos = Array.isArray(snapshot.json?.promos)
    ? snapshot.json.promos
    : [];

  {
    const dataPath = path.join(
      __dirname,
      '..',
      '..',
      'admin',
      'src',
      'components',
      'promos',
      'promo-data.ts',
    );
    const src = fs.readFileSync(dataPath, 'utf8');
    !src.includes('PROMOS_DEMO_ROWS')
      ? pass('admin_promos_no_demo_rows')
      : fail('admin_promos_no_demo_rows');
  }

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
        promos: [{ ...good.promos[0], deepLink: 'ffops://user:pass@home' }],
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
        promos: [{ ...good.promos[0], deepLink: 'https://evil.example/phish' }],
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
        promos: [{ ...good.promos[0], deepLink: 'javascript:alert(1)' }],
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
        promos: [{ ...good.promos[0], deepLink: 'ffops://not_a_real_route' }],
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
        promos: [{ ...good.promos[0], startsAt: endsAt, endsAt: startsAt }],
      },
    });
    r.status === 400
      ? pass('reject_bad_window')
      : fail('reject_bad_window', `status=${r.status}`);
  }

  await runPromoPersistChecks(adminTok, { startsAt, endsAt });

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

  const restored = await restorePromos(adminTok, snapshotPromos);
  restored.status === 200
    ? pass('restore_catalog', `count=${snapshotPromos.length}`)
    : fail('restore_catalog', `status=${restored.status}`);

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
