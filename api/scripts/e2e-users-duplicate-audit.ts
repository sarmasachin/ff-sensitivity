/**
 * Audit: are duplicate users being created?
 * Run: npx ts-node --transpile-only scripts/e2e-users-duplicate-audit.ts
 * Prints counts only — no emails/secrets.
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

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

function pass(name: string, detail?: string) {
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name: string, detail?: string) {
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}
function note(name: string, detail: string) {
  console.log(`NOTE  ${name} — ${detail}`);
}

async function main() {
  loadEnv();

  const total = await prisma.user.count();
  const notSoftDeleted = await prisma.user.count({
    where: { dataDeletedAt: null },
  });
  const softDeleted = await prisma.user.count({
    where: { dataDeletedAt: { not: null } },
  });
  const inactive = await prisma.user.count({
    where: { dataDeletedAt: null, isActive: false },
  });
  const e2eLike = await prisma.user.count({
    where: {
      OR: [
        { email: { startsWith: 'e2e.' } },
        { email: { startsWith: 'e2e-' } },
        { googleSub: { startsWith: 'e2e-' } },
        { googleSub: { startsWith: 'e2e.' } },
        { email: { contains: '@example.com' } },
      ],
    },
  });

  note(
    'totals',
    `all=${total} dataDeletedAtNull=${notSoftDeleted} softDeleted=${softDeleted} isActiveFalse=${inactive} e2eOrExample=${e2eLike}`,
  );

  // DB uniqueness: duplicate google_sub / email cannot exist if @@unique holds
  const dupGoogle = await prisma.$queryRaw<
    { c: bigint }[]
  >`SELECT COUNT(*)::bigint AS c FROM (
      SELECT google_sub FROM users GROUP BY google_sub HAVING COUNT(*) > 1
    ) t`;
  const dupEmail = await prisma.$queryRaw<{ c: bigint }[]>`SELECT COUNT(*)::bigint AS c FROM (
      SELECT lower(email) AS e FROM users GROUP BY lower(email) HAVING COUNT(*) > 1
    ) t`;
  const dupGoogleN = Number(dupGoogle[0]?.c ?? 0);
  const dupEmailN = Number(dupEmail[0]?.c ?? 0);

  dupGoogleN === 0
    ? pass('no duplicate google_sub rows', 'UNIQUE constraint holds')
    : fail('no duplicate google_sub rows', `groups=${dupGoogleN}`);
  dupEmailN === 0
    ? pass('no duplicate email rows (case-insensitive)', 'UNIQUE / lower(email)')
    : fail('no duplicate email rows (case-insensitive)', `groups=${dupEmailN}`);

  // Same displayName many times is NOT a duplicate account (common names)
  const sameName = await prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*)::bigint AS n FROM (
      SELECT display_name FROM users
      WHERE data_deleted_at IS NULL AND display_name IS NOT NULL AND length(trim(display_name)) > 0
      GROUP BY display_name HAVING COUNT(*) > 1
    ) t`;
  note(
    'shared displayName groups',
    `${Number(sameName[0]?.n ?? 0)} (not account dupes — Google names can repeat)`,
  );

  // Same install_id linked to multiple users?
  const multiUserInstalls = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(*)::bigint AS n FROM (
      SELECT install_id FROM device_installs
      WHERE install_id IS NOT NULL AND length(trim(install_id)) > 0
        AND user_id IS NOT NULL
      GROUP BY install_id
      HAVING COUNT(DISTINCT user_id) > 1
    ) t`;
  const multiN = Number(multiUserInstalls[0]?.n ?? 0);
  multiN === 0
    ? pass('no install_id shared across different user_ids')
    : fail('no install_id shared across different user_ids', `installs=${multiN}`);

  // Users with 0 devices vs many
  const usersNoDevice = await prisma.user.count({
    where: { dataDeletedAt: null, deviceInstalls: { none: {} } },
  });
  const usersMultiDevice = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(*)::bigint AS n FROM (
      SELECT user_id FROM device_installs
      WHERE user_id IS NOT NULL
      GROUP BY user_id HAVING COUNT(*) > 1
    ) t`;
  note(
    'device linkage',
    `activeUsersWithNoDevice=${usersNoDevice} usersWithMultipleDevices=${Number(usersMultiDevice[0]?.n ?? 0)}`,
  );

  // Recent create burst (possible seed spam)
  const last7 = await prisma.user.count({
    where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
  });
  const last30 = await prisma.user.count({
    where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
  });
  note('recent signups', `last7d=${last7} last30d=${last30}`);

  // Play installs (575) vs accounts: expected mismatch explanation from counts
  note(
    'Play installs vs admin accounts',
    `Play shows device installs; admin shows Google seats over time (incl. uninstalls, reinstalls with same Google = 1 seat, different Google = new seat). Not 1:1.`,
  );

  // Schema uniqueness check via prisma
  const schemaHasUnique =
    fs
      .readFileSync(path.join(__dirname, '..', 'prisma', 'schema.prisma'), 'utf8')
      .includes('googleSub') &&
    /googleSub\s+String\s+@unique/.test(
      fs.readFileSync(path.join(__dirname, '..', 'prisma', 'schema.prisma'), 'utf8'),
    ) &&
    /email\s+String\s+@unique/.test(
      fs.readFileSync(path.join(__dirname, '..', 'prisma', 'schema.prisma'), 'utf8'),
    );
  schemaHasUnique
    ? pass('Prisma User.googleSub + User.email are @unique')
    : fail('Prisma User.googleSub + User.email are @unique');

  // Login upsert path uses googleSub as identity
  const authSrc = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'user-auth', 'user-auth.service.ts'),
    'utf8',
  );
  /upsert\(\s*\{\s*where:\s*\{\s*googleSub/.test(authSrc)
    ? pass('login uses upsert where googleSub (no new row per login)')
    : fail('login uses upsert where googleSub (no new row per login)');

  await prisma.$disconnect();
  const failed = (global as any).__failed as number | undefined;
  console.log('\nDone. If PASS on google_sub/email uniqueness → admin is NOT creating duplicate seats.');
  process.exit(dupGoogleN || dupEmailN || multiN || !schemaHasUnique ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
