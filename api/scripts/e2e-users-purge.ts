/**
 * Soft-deleted users older than 90 days are hard-removed.
 * Admin googleBanned seats keep login blocked via BannedGoogleAccount.
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import {
  DELETED_USER_RETENTION_DAYS,
  purgeDeletedUsers,
} from '../src/users/users-purge';

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

async function main() {
  loadEnv();
  const stamp = Date.now();
  const old = new Date(
    Date.now() - (DELETED_USER_RETENTION_DAYS + 1) * 86_400_000,
  );
  const recent = new Date(Date.now() - 7 * 86_400_000);

  const selfGone = await prisma.user.create({
    data: {
      googleSub: `e2e-purge-self-${stamp}`,
      email: `purge-self-${stamp}@example.com`,
      displayName: 'Purge Self',
      isActive: false,
      googleBanned: false,
      dataDeletedAt: old,
      coins: 0,
    },
  });
  const bannedGone = await prisma.user.create({
    data: {
      googleSub: `e2e-purge-ban-${stamp}`,
      email: `purge-ban-${stamp}@example.com`,
      displayName: 'Deleted user',
      isActive: false,
      googleBanned: true,
      dataDeletedAt: old,
      coins: 0,
    },
  });
  const stillSoft = await prisma.user.create({
    data: {
      googleSub: `e2e-purge-fresh-${stamp}`,
      email: `purge-fresh-${stamp}@example.com`,
      displayName: 'Fresh Soft Delete',
      isActive: false,
      googleBanned: false,
      dataDeletedAt: recent,
      coins: 0,
    },
  });

  await prisma.appAnalyticsEvent.create({
    data: {
      userId: selfGone.id,
      name: 'login',
    },
  });

  const result = await purgeDeletedUsers(prisma);
  result.purged >= 2
    ? pass('purge_removed_stale', `purged=${result.purged}`)
    : fail('purge_removed_stale', JSON.stringify(result));

  const selfAfter = await prisma.user.findUnique({ where: { id: selfGone.id } });
  !selfAfter
    ? pass('self_delete_row_gone')
    : fail('self_delete_row_gone', 'row still present');

  const events = await prisma.appAnalyticsEvent.count({
    where: { userId: selfGone.id },
  });
  events === 0
    ? pass('analytics_cleared')
    : fail('analytics_cleared', `count=${events}`);

  const bannedAfter = await prisma.user.findUnique({
    where: { id: bannedGone.id },
  });
  !bannedAfter
    ? pass('admin_ban_row_gone')
    : fail('admin_ban_row_gone', 'row still present');

  const banSeat = await prisma.bannedGoogleAccount.findUnique({
    where: { googleSub: bannedGone.googleSub },
  });
  banSeat?.email === bannedGone.email
    ? pass('ban_seat_kept')
    : fail('ban_seat_kept', JSON.stringify(banSeat));

  // Same lookup UserAuthService.loginWithGoogle uses before upsert.
  const authBanBySub = await prisma.bannedGoogleAccount.findFirst({
    where: {
      OR: [{ googleSub: bannedGone.googleSub }, { email: bannedGone.email }],
    },
    select: { id: true },
  });
  authBanBySub
    ? pass('auth_ban_lookup_blocks')
    : fail('auth_ban_lookup_blocks', 'ban row not visible to auth query');

  const softAfter = await prisma.user.findUnique({
    where: { id: stillSoft.id },
  });
  softAfter?.dataDeletedAt
    ? pass('recent_soft_delete_kept')
    : fail('recent_soft_delete_kept', 'missing soft-deleted row');

  const audit = await prisma.auditLog.findFirst({
    where: {
      action: 'user:auto-purge',
      entity: `user:${bannedGone.id}`,
    },
    orderBy: { createdAt: 'desc' },
  });
  audit
    ? pass('audit_auto_purge_logged')
    : fail('audit_auto_purge_logged', 'missing audit row');

  const second = await purgeDeletedUsers(prisma);
  const stillThere = await prisma.user.findUnique({
    where: { id: stillSoft.id },
  });
  second.purged === 0 && stillThere
    ? pass('idempotent_no_extra_purge')
    : fail(
        'idempotent_no_extra_purge',
        `purged=${second.purged} soft=${Boolean(stillThere)}`,
      );

  // Self-deleted (not googleBanned) must NOT leave a ban seat.
  const noBanForSelf = await prisma.bannedGoogleAccount.findUnique({
    where: { googleSub: selfGone.googleSub },
  });
  !noBanForSelf
    ? pass('self_delete_no_ban_seat')
    : fail('self_delete_no_ban_seat', JSON.stringify(noBanForSelf));

  await prisma.user.deleteMany({
    where: {
      id: { in: [stillSoft.id].filter(Boolean) as string[] },
    },
  });
  await prisma.bannedGoogleAccount.deleteMany({
    where: { googleSub: bannedGone.googleSub },
  });
  await prisma.auditLog.deleteMany({
    where: {
      action: 'user:auto-purge',
      entity: {
        in: [`user:${selfGone.id}`, `user:${bannedGone.id}`],
      },
    },
  });

  const failed = checks.filter((c) => !c.ok);
  console.log(
    failed.length === 0
      ? `\nAll ${checks.length} purge checks passed.`
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
    await prisma.$disconnect();
  });
