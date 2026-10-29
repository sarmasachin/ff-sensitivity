/**
 * Users desk stats must count the full User table, not only the take:500 list.
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { countUserDeskStats } from '../src/users/users-stats';

const API = process.env.API_BASE ?? 'http://127.0.0.1:4000';
const prisma = new PrismaClient();
const PAD_PREFIX = 'e2e-stats-pad-';

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

function readAccessCookie(res: Response): string | undefined {
  const cookies =
    typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : [];
  for (const c of cookies) {
    const m = /^access_token=([^;]+)/.exec(c);
    if (m) return decodeURIComponent(m[1]);
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
    json = { raw: text };
  }
  return {
    status: res.status,
    json,
    accessToken: json?.accessToken || readAccessCookie(res),
  };
}

function statsShapeOk(stats: any): boolean {
  return (
    stats &&
    typeof stats.total === 'number' &&
    typeof stats.active === 'number' &&
    typeof stats.restricted === 'number' &&
    typeof stats.suspended === 'number' &&
    typeof stats.deleted === 'number' &&
    typeof stats.coinsHeld === 'number'
  );
}

async function cleanupPad() {
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { startsWith: `${PAD_PREFIX}` } },
        { googleSub: { startsWith: `${PAD_PREFIX}` } },
      ],
    },
  });
}

async function main() {
  loadEnv();
  await cleanupPad();

  const adminEmail = process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';
  const adminPassword = process.env.SUPERADMIN_PASSWORD ?? '123456';
  const login = await req('POST', '/api/v1/auth/login', {
    body: { email: adminEmail, password: adminPassword },
  });
  if (login.status >= 400 || !login.accessToken) {
    fail('admin_login', `${login.status} ${JSON.stringify(login.json)}`);
    await prisma.$disconnect();
    process.exit(1);
  }
  pass('admin_login');
  const tok = login.accessToken!;

  const beforeDb = await countUserDeskStats(prisma);
  const listBefore = await req('GET', '/api/v1/admin/users', { token: tok });
  if (listBefore.status !== 200) {
    fail('list_before', `status=${listBefore.status}`);
  } else if (!Array.isArray(listBefore.json?.users)) {
    fail('list_before', 'users missing');
  } else if (!statsShapeOk(listBefore.json.stats)) {
    fail('stats_present_before', JSON.stringify(listBefore.json?.stats));
  } else {
    pass('stats_present_before');
    const s = listBefore.json.stats;
    const bucketSum =
      s.active + s.restricted + s.suspended + s.deleted;
    s.total === beforeDb.total &&
    s.active === beforeDb.active &&
    s.restricted === beforeDb.restricted &&
    s.suspended === beforeDb.suspended &&
    s.deleted === beforeDb.deleted &&
    s.coinsHeld === beforeDb.coinsHeld
      ? pass(
          'stats_match_db_before',
          `total=${s.total} list=${listBefore.json.users.length}`,
        )
      : fail(
          'stats_match_db_before',
          `api=${JSON.stringify(s)} db=${JSON.stringify(beforeDb)}`,
        );
    bucketSum === s.total
      ? pass('buckets_sum_to_total_before', `sum=${bucketSum}`)
      : fail('buckets_sum_to_total_before', `sum=${bucketSum} total=${s.total}`);
    listBefore.json.users.length <= 500
      ? pass('list_capped_at_500_before', `len=${listBefore.json.users.length}`)
      : fail('list_capped_at_500_before', `len=${listBefore.json.users.length}`);
  }

  // Marker seats so status buckets are exercised against full-table stats.
  const stamp = Date.now();
  const markerActive = await prisma.user.create({
    data: {
      googleSub: `${PAD_PREFIX}active-${stamp}`,
      email: `${PAD_PREFIX}active-${stamp}@example.com`,
      displayName: 'Pad Active',
      isActive: true,
      isRestricted: false,
      coins: 11,
    },
  });
  const markerRestricted = await prisma.user.create({
    data: {
      googleSub: `${PAD_PREFIX}rest-${stamp}`,
      email: `${PAD_PREFIX}rest-${stamp}@example.com`,
      displayName: 'Pad Restricted',
      isActive: true,
      isRestricted: true,
      coins: 7,
    },
  });
  const markerSuspended = await prisma.user.create({
    data: {
      googleSub: `${PAD_PREFIX}susp-${stamp}`,
      email: `${PAD_PREFIX}susp-${stamp}@example.com`,
      displayName: 'Pad Suspended',
      isActive: false,
      isRestricted: false,
      dataDeletedAt: null,
      coins: 3,
    },
  });
  const markerDeleted = await prisma.user.create({
    data: {
      googleSub: `${PAD_PREFIX}del-${stamp}`,
      email: `${PAD_PREFIX}del-${stamp}@example.com`,
      displayName: 'Deleted user',
      isActive: false,
      googleBanned: true,
      dataDeletedAt: new Date(),
      coins: 0,
    },
  });

  const need = Math.max(0, 501 - (await prisma.user.count()));
  if (need > 0) {
    const rows = Array.from({ length: need }, (_, i) => ({
      googleSub: `${PAD_PREFIX}bulk-${stamp}-${i}`,
      email: `${PAD_PREFIX}bulk-${stamp}-${i}@example.com`,
      displayName: `Pad ${i}`,
      isActive: true,
      isRestricted: false,
      coins: 1,
    }));
    const chunk = 100;
    for (let i = 0; i < rows.length; i += chunk) {
      await prisma.user.createMany({ data: rows.slice(i, i + chunk) });
    }
    pass('seeded_past_list_cap', `added=${need}`);
  } else {
    pass('seeded_past_list_cap', 'already over 500');
  }

  const dbAfter = await countUserDeskStats(prisma);
  const listAfter = await req('GET', '/api/v1/admin/users', { token: tok });
  if (listAfter.status !== 200 || !statsShapeOk(listAfter.json?.stats)) {
    fail('list_after', `status=${listAfter.status}`);
  } else {
    const s = listAfter.json.stats;
    const users = listAfter.json.users as unknown[];
    dbAfter.total > 500
      ? pass('db_total_over_500', `total=${dbAfter.total}`)
      : fail('db_total_over_500', `total=${dbAfter.total}`);
    s.total === dbAfter.total &&
    s.active === dbAfter.active &&
    s.restricted === dbAfter.restricted &&
    s.suspended === dbAfter.suspended &&
    s.deleted === dbAfter.deleted &&
    s.coinsHeld === dbAfter.coinsHeld
      ? pass('stats_match_db_after_cap', `total=${s.total}`)
      : fail(
          'stats_match_db_after_cap',
          `api=${JSON.stringify(s)} db=${JSON.stringify(dbAfter)}`,
        );
    users.length === 500
      ? pass('list_exactly_500_when_over', `len=${users.length}`)
      : fail('list_exactly_500_when_over', `len=${users.length}`);
    s.total > users.length
      ? pass(
          'stats_not_from_list_length',
          `stats=${s.total} list=${users.length}`,
        )
      : fail(
          'stats_not_from_list_length',
          `stats=${s.total} list=${users.length}`,
        );
    s.active + s.restricted + s.suspended + s.deleted === s.total
      ? pass('buckets_sum_to_total_after')
      : fail('buckets_sum_to_total_after');

    // Markers must be reflected in full-table stats (not only if they fit in take:500).
    const markersAlive = await prisma.user.findMany({
      where: {
        id: {
          in: [
            markerActive.id,
            markerRestricted.id,
            markerSuspended.id,
            markerDeleted.id,
          ],
        },
      },
      select: { id: true },
    });
    markersAlive.length === 4
      ? pass('marker_rows_exist')
      : fail('marker_rows_exist', `found=${markersAlive.length}`);
  }

  await cleanupPad();
  const cleaned = await prisma.user.count({
    where: {
      OR: [
        { email: { startsWith: PAD_PREFIX } },
        { googleSub: { startsWith: PAD_PREFIX } },
        {
          id: {
            in: [
              markerActive.id,
              markerRestricted.id,
              markerSuspended.id,
              markerDeleted.id,
            ],
          },
        },
      ],
    },
  });
  cleaned === 0
    ? pass('cleanup_pad_users')
    : fail('cleanup_pad_users', `left=${cleaned}`);

  // Prove old bug path: list-length stats would be wrong after >500.
  // After cleanup, API stats must again equal DB (regression smoke).
  const finalDb = await countUserDeskStats(prisma);
  const finalList = await req('GET', '/api/v1/admin/users', { token: tok });
  finalList.status === 200 &&
  statsShapeOk(finalList.json?.stats) &&
  finalList.json.stats.total === finalDb.total
    ? pass('stats_ok_after_cleanup', `total=${finalDb.total}`)
    : fail(
        'stats_ok_after_cleanup',
        JSON.stringify({
          status: finalList.status,
          stats: finalList.json?.stats,
          db: finalDb,
        }),
      );

  const failed = checks.filter((c) => !c.ok);
  console.log(
    failed.length === 0
      ? `\nAll ${checks.length} users-stats checks passed.`
      : `\n${failed.length}/${checks.length} failed.`,
  );
  process.exitCode = failed.length === 0 ? 0 : 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanupPad().catch(() => undefined);
    await prisma.$disconnect();
  });
