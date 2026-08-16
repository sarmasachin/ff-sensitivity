/**
 * Extra promos security cross-checks (local).
 */
import * as jwt from 'jsonwebtoken';
import {
  checks,
  fail,
  loadEnv,
  mintSuperToken,
  pass,
  prisma,
  req,
  restorePromos,
} from './e2e-promos-lib';

function pad(n: number) {
  return String(n).padStart(2, '0');
}
function fmt(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function main() {
  loadEnv();
  const at = await mintSuperToken();
  if (!at) {
    fail('super_login', 'active admin not found');
    process.exit(1);
  }
  pass('super_login', 'minted jwt');

  const snapshot = await req('GET', '/api/v1/admin/promos', { token: at });
  const snapshotPromos = Array.isArray(snapshot.json?.promos)
    ? snapshot.json.promos
    : [];

  const now = new Date();
  const pastStart = new Date(now.getTime() - 5 * 24 * 3600_000);
  const pastEnd = new Date(now.getTime() - 2 * 24 * 3600_000);
  const liveStart = new Date(now.getTime() - 1 * 24 * 3600_000);
  const liveEnd = new Date(now.getTime() + 5 * 24 * 3600_000);
  const futureStart = new Date(now.getTime() + 2 * 24 * 3600_000);
  const futureEnd = new Date(now.getTime() + 10 * 24 * 3600_000);

  const base = {
    subtitle: 'x',
    imageLabel: 'img',
    placement: 'HOME_BANNER' as const,
    sortOrder: 1,
    enabled: true,
  };

  let r = await req('PUT', '/api/v1/admin/promos', {
    token: at,
    body: {
      promos: [
        {
          ...base,
          id: 'e2e_live',
          title: 'Live',
          deepLink: 'ffops://challenge',
          startsAt: fmt(liveStart),
          endsAt: fmt(liveEnd),
        },
        {
          ...base,
          id: 'e2e_sched',
          title: 'Scheduled',
          deepLink: 'ffops://scratch',
          sortOrder: 2,
          startsAt: fmt(futureStart),
          endsAt: fmt(futureEnd),
        },
        {
          ...base,
          id: 'e2e_past',
          title: 'Past',
          deepLink: 'ffops://shop',
          sortOrder: 3,
          startsAt: fmt(pastStart),
          endsAt: fmt(pastEnd),
        },
      ],
    },
  });
  r.status === 200
    ? pass('seed_windows')
    : fail('seed_windows', String(r.status));

  r = await req('GET', '/api/v1/promos/live');
  const ids = (r.json?.promos ?? []).map((p: any) => p.id);
  ids.includes('e2e_live') &&
  !ids.includes('e2e_sched') &&
  !ids.includes('e2e_past')
    ? pass('live_excludes_scheduled_and_ended', JSON.stringify(ids))
    : fail('live_excludes_scheduled_and_ended', JSON.stringify(ids));

  const leaked = (r.json?.promos ?? []).some(
    (p: any) =>
      p.startsAt !== undefined ||
      p.endsAt !== undefined ||
      p.enabled !== undefined,
  );
  !leaked ? pass('public_no_schedule_fields') : fail('public_no_schedule_fields');

  r = await req('POST', '/api/v1/admin/promos', {
    token: at,
    body: {
      ...base,
      id: 'e2e_bad_link',
      title: 'Bad',
      deepLink: 'https://evil.example/phish',
      startsAt: fmt(liveStart),
      endsAt: fmt(liveEnd),
    },
  });
  r.status === 400
    ? pass('item_reject_https_deeplink')
    : fail('item_reject_https_deeplink', String(r.status));

  r = await req('PUT', '/api/v1/admin/promos', {
    token: at,
    body: {
      promos: [
        {
          ...base,
          id: 'cred',
          title: 'Cred',
          deepLink: 'ffops://user:pass@home',
          startsAt: fmt(liveStart),
          endsAt: fmt(liveEnd),
        },
      ],
    },
  });
  r.status === 400
    ? pass('reject_deeplink_credentials')
    : fail('reject_deeplink_credentials', String(r.status));

  r = await req('PUT', '/api/v1/admin/promos', {
    token: at,
    body: {
      promos: [
        {
          ...base,
          id: 'data',
          title: 'Data',
          deepLink: 'data:text/html,hi',
          startsAt: fmt(liveStart),
          endsAt: fmt(liveEnd),
        },
      ],
    },
  });
  r.status === 400
    ? pass('reject_data_deeplink')
    : fail('reject_data_deeplink', String(r.status));

  r = await req('PUT', '/api/v1/admin/promos', {
    token: at,
    body: {
      promos: [
        {
          ...base,
          id: 'empty_title',
          title: '\u200b\u200b',
          deepLink: 'ffops://home',
          startsAt: fmt(liveStart),
          endsAt: fmt(liveEnd),
        },
      ],
    },
  });
  r.status === 400
    ? pass('reject_zwsp_title')
    : fail('reject_zwsp_title', String(r.status));

  r = await req('PUT', '/api/v1/admin/promos', {
    token: at,
    body: {
      promos: [
        {
          ...base,
          id: 'dup1',
          title: 'A',
          deepLink: 'ffops://home',
          startsAt: fmt(liveStart),
          endsAt: fmt(liveEnd),
        },
        {
          ...base,
          id: 'dup1',
          title: 'B',
          deepLink: 'ffops://shop',
          sortOrder: 2,
          startsAt: fmt(liveStart),
          endsAt: fmt(liveEnd),
        },
      ],
    },
  });
  r.status === 400
    ? pass('reject_dup_id')
    : fail('reject_dup_id', String(r.status));

  r = await req('PUT', '/api/v1/admin/promos', {
    token: at,
    body: {
      promos: [
        {
          ...base,
          id: 'norm',
          title: 'Norm',
          deepLink: 'ffops://challenge?x=https://evil.example',
          startsAt: fmt(liveStart),
          endsAt: fmt(liveEnd),
        },
      ],
    },
  });
  r.status === 200 && r.json?.promos?.[0]?.deepLink === 'ffops://challenge'
    ? pass('normalize_strips_query')
    : fail(
        'normalize_strips_query',
        `${r.status} ${r.json?.promos?.[0]?.deepLink}`,
      );

  const user = await prisma.user.upsert({
    where: { email: 'e2e.promos.user@example.com' },
    update: { isActive: true },
    create: {
      googleSub: 'e2e-promos-user',
      email: 'e2e.promos.user@example.com',
      displayName: 'Promos User',
      isActive: true,
    },
  });
  const userTok = jwt.sign(
    { sub: user.id, email: user.email, aud: 'user' },
    process.env.JWT_USER_SECRET!,
    { expiresIn: '1h' },
  );
  r = await req('GET', '/api/v1/admin/promos', { token: userTok });
  r.status === 401
    ? pass('user_jwt_blocked_on_admin')
    : fail('user_jwt_blocked_on_admin', String(r.status));

  const restored = await restorePromos(at, snapshotPromos);
  restored.status === 200
    ? pass('restore', `count=${snapshotPromos.length}`)
    : fail('restore', `status=${restored.status}`);

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
