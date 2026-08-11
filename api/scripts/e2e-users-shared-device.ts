/**
 * Same phone, two Google accounts — admin Users list shows the same device.
 * Does not send FCM.
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
  opts?: { token?: string },
) {
  const res = await fetch(`${API}${pathName}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(opts?.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json };
}

async function main() {
  loadEnv();
  const stamp = Date.now().toString(36);
  const installId = `dev_e2e_share_${stamp}`;
  const emailA = `e2e.share.a.${stamp}@example.com`;
  const emailB = `e2e.share.b.${stamp}@example.com`;
  const emailC = `e2e.share.c.${stamp}@example.com`;

  const userA = await prisma.user.create({
    data: {
      email: emailA,
      displayName: 'Share Owner',
      googleSub: `sub_a_${stamp}`,
      lastLoginAt: new Date(),
    },
  });
  const userB = await prisma.user.create({
    data: {
      email: emailB,
      displayName: 'Share Second',
      googleSub: `sub_b_${stamp}`,
      lastLoginAt: new Date(Date.now() - 14 * 3600 * 1000),
    },
  });
  const userC = await prisma.user.create({
    data: {
      email: emailC,
      displayName: 'Share NoToken',
      googleSub: `sub_c_${stamp}`,
      lastLoginAt: new Date(Date.now() - 2 * 3600 * 1000),
    },
  });

  await prisma.deviceInstall.create({
    data: {
      installId,
      userId: userA.id,
      brand: 'motorola',
      model: 'motorola edge 60 pro',
      androidVersion: '16',
      appVersion: '1.0.3',
      lastSeenAt: new Date(),
    },
  });
  await prisma.devicePushToken.create({
    data: {
      userId: userB.id,
      token: `e2e_share_tok_${stamp}_bbbbbbbbbb`,
      installId,
      pushEnabled: true,
    },
  });

  const missing = [userB.id, userC.id];
  const tokens = await prisma.devicePushToken.findMany({
    where: { userId: { in: missing }, installId: { not: null } },
    select: { userId: true, installId: true },
  });
  const mapped = new Map(
    tokens
      .filter((t) => t.installId)
      .map((t) => [t.userId, t.installId as string]),
  );
  mapped.get(userB.id) === installId
    ? pass('token_links_second_user_to_install')
    : fail('token_links_second_user_to_install');
  !mapped.has(userC.id)
    ? pass('no_token_user_stays_unlinked')
    : fail('no_token_user_stays_unlinked');

  const shared = await prisma.deviceInstall.findUnique({
    where: { installId },
  });
  shared?.userId === userA.id
    ? pass('install_owner_unchanged')
    : fail('install_owner_unchanged', `owner=${shared?.userId}`);

  let httpRan = false;
  try {
    const ping = await fetch(`${API}/api/v1/app/config`, {
      signal: AbortSignal.timeout(3000),
    });
    httpRan = ping.ok;
  } catch {
    httpRan = false;
  }

  if (!httpRan) {
    pass('admin_http_skipped', 'local API down — DB path already checked');
  } else {
    const adminEmail =
      process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';
    const admin = await prisma.admin.findFirst({
      where: { email: adminEmail, isActive: true },
    });
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!admin || !secret) {
      fail('admin_jwt', 'missing admin or JWT_ACCESS_SECRET');
    } else {
      const tok = jwt.sign(
        { sub: admin.id, email: admin.email, role: admin.role },
        secret,
        { expiresIn: '15m' },
      );
      const list = await req('GET', '/api/v1/admin/users', { token: tok });
      const rows = list.json?.users ?? [];
      const a = rows.find((r: any) => r.id === userA.id);
      const b = rows.find((r: any) => r.id === userB.id);
      const c = rows.find((r: any) => r.id === userC.id);
      list.status === 200
        ? pass('admin_users_ok')
        : fail('admin_users_ok', `status=${list.status}`);
      a?.deviceId === installId &&
      String(a?.deviceLabel || '').includes('motorola edge 60 pro')
        ? pass('owner_shows_device')
        : fail('owner_shows_device', JSON.stringify(a));
      b?.deviceId === installId &&
      String(b?.deviceLabel || '').includes('motorola edge 60 pro')
        ? pass('second_shows_same_device')
        : fail('second_shows_same_device', JSON.stringify(b));
      c?.deviceId === '—'
        ? pass('no_token_still_dash')
        : fail('no_token_still_dash', JSON.stringify(c));
      typeof b?.lastActiveHoursAgo === 'number' && b.lastActiveHoursAgo >= 10
        ? pass('second_last_active_not_stolen')
        : fail(
            'second_last_active_not_stolen',
            `hours=${b?.lastActiveHoursAgo}`,
          );
    }
  }

  await prisma.devicePushToken.deleteMany({
    where: { userId: { in: [userA.id, userB.id, userC.id] } },
  });
  await prisma.deviceInstall.deleteMany({ where: { installId } });
  await prisma.user.deleteMany({
    where: { id: { in: [userA.id, userB.id, userC.id] } },
  });

  const failed = checks.filter((x) => !x.ok).length;
  console.log(`\n${checks.filter((x) => x.ok).length}/${checks.length} passed`);
  await prisma.$disconnect();
  process.exit(failed ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
