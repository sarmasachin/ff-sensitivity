/**
 * Cross-check: uninstall/reinstall leftovers must not stay live.
 * Local API + Postgres only. Does not print token values.
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
function okAuth(status: number) {
  return status === 200 || status === 201;
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
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json };
}

function userJwt(userId: string, email: string) {
  return jwt.sign(
    { sub: userId, email, aud: 'user' },
    process.env.JWT_USER_SECRET!,
    { expiresIn: '1h' },
  );
}

async function main() {
  loadEnv();
  const stamp = Date.now().toString(36);
  const emailA = `e2e.retire.a.${stamp}@example.com`;
  const emailB = `e2e.retire.b.${stamp}@example.com`;
  const emailC = `e2e.retire.c.${stamp}@example.com`;

  const [userA, userB, userC] = await Promise.all([
    prisma.user.create({
      data: {
        googleSub: `e2e-retire-a-${stamp}`,
        email: emailA,
        displayName: 'Retire A',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        googleSub: `e2e-retire-b-${stamp}`,
        email: emailB,
        displayName: 'Retire B',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        googleSub: `e2e-retire-c-${stamp}`,
        email: emailC,
        displayName: 'Retire C',
        isActive: true,
      },
    }),
  ]);

  const oldInstalls = Array.from({ length: 7 }, (_, i) =>
    `dev_old${stamp}${i}`.slice(0, 28),
  );
  const liveInstall = `dev_live${stamp}`.slice(0, 28);
  // Keep < 20 chars so FCM multicast skips them; this test asserts DB fan-out.
  const liveToken = `tokA${stamp}`.slice(0, 16);

  for (let i = 0; i < oldInstalls.length; i++) {
    const installId = oldInstalls[i];
    await prisma.deviceInstall.create({
      data: {
        installId,
        userId: userA.id,
        brand: 'Test',
        model: `Old${i}`,
        hasFcmToken: true,
        pushEnabled: true,
      },
    });
    await prisma.devicePushToken.create({
      data: {
        userId: userA.id,
        token: `old${i}${stamp}`.slice(0, 16),
        platform: 'android',
        topics: ['all_users', 'feature_names'],
        installId,
        pushEnabled: true,
        lastSeenAt: new Date(Date.now() - (i + 1) * 3600_000),
      },
    });
  }

  const before = await prisma.devicePushToken.count({
    where: { userId: userA.id, pushEnabled: true },
  });
  before === 7
    ? pass('seed_seven_stale_tokens')
    : fail('seed_seven_stale_tokens', `enabled=${before}`);

  const tokA = userJwt(userA.id, emailA);
  const tokB = userJwt(userB.id, emailB);
  const register = await req('POST', '/api/v1/push/device', {
    token: tokA,
    body: {
      token: liveToken,
      platform: 'android',
      topics: ['all_users', 'feature_names'],
      installId: liveInstall,
    },
  });
  okAuth(register.status) && register.json?.ok === true
    ? pass('register_fresh_install')
    : fail('register_fresh_install', `status=${register.status}`);

  const afterA = await prisma.devicePushToken.findMany({
    where: { userId: userA.id },
    select: { pushEnabled: true, token: true, installId: true },
  });
  const enabledA = afterA.filter((t) => t.pushEnabled);
  enabledA.length === 1
    ? pass('one_live_token_after_reinstall', `enabled=${enabledA.length}`)
    : fail(
        'one_live_token_after_reinstall',
        `enabled=${enabledA.length} total=${afterA.length}`,
      );
  enabledA[0]?.token === liveToken
    ? pass('live_token_is_newest')
    : fail('live_token_is_newest');

  const oldInstallRows = await prisma.deviceInstall.findMany({
    where: { installId: { in: oldInstalls } },
  });
  const retiredInstalls = oldInstallRows.filter(
    (r) => !r.pushEnabled && !r.hasFcmToken && r.uninstallSuspectedAt,
  );
  retiredInstalls.length === 7
    ? pass('old_installs_marked_uninstalled')
    : fail(
        'old_installs_marked_uninstalled',
        `retired=${retiredInstalls.length}`,
      );

  // Other account must stay independent.
  await req('POST', '/api/v1/push/device', {
    token: tokB,
    body: {
      token: `tokB${stamp}`.slice(0, 16),
      platform: 'android',
      topics: ['all_users'],
      installId: `dev_b${stamp}`.slice(0, 28),
    },
  });
  const enabledB = await prisma.devicePushToken.count({
    where: { userId: userB.id, pushEnabled: true },
  });
  enabledB === 1
    ? pass('other_user_token_untouched')
    : fail('other_user_token_untouched', `enabledB=${enabledB}`);

  // Pre-existing leftovers (user never re-opened app) get pruned on send.
  for (let i = 0; i < 3; i++) {
    await prisma.devicePushToken.create({
      data: {
        userId: userC.id,
        token: `tokC${i}${stamp}`.slice(0, 16),
        platform: 'android',
        topics: ['all_users'],
        installId: `dev_c${stamp}${i}`.slice(0, 28),
        pushEnabled: true,
        lastSeenAt: new Date(Date.now() - (3 - i) * 60_000),
      },
    });
  }

  const adminEmail = process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';
  const admin = await prisma.admin.findUnique({ where: { email: adminEmail } });
  if (!admin || !process.env.JWT_ACCESS_SECRET) {
    fail('admin_login', 'missing admin or JWT_ACCESS_SECRET');
  } else {
    const adminTok = jwt.sign(
      { sub: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' },
    );
    pass('admin_login');
    const cid = `e2e_retire_${stamp}`;
    const put = await req('PUT', '/api/v1/admin/push', {
      token: adminTok,
      body: {
        id: cid,
        title: 'Retire check',
        body: 'Should target unique live users only',
        deepLink: 'ffops://inbox',
        audience: 'ALL',
        topic: '',
        scheduleMode: 'draft',
      },
    });
    okAuth(put.status)
      ? pass('campaign_upsert')
      : fail('campaign_upsert', `status=${put.status}`);

    const send = await req('POST', `/api/v1/admin/push/${cid}/send`, {
      token: adminTok,
      body: {},
    });
    const delivered = send.json?.campaign?.delivered;
    okAuth(send.status) && send.json?.campaign?.status === 'SENT'
      ? pass('campaign_sent', `delivered=${delivered} failed=${send.json?.campaign?.failed}`)
      : fail('campaign_sent', `status=${send.status}`);

    const enabledC = await prisma.devicePushToken.count({
      where: { userId: userC.id, pushEnabled: true },
    });
    enabledC === 1
      ? pass('send_prunes_stale_user_tokens', `enabledC=${enabledC}`)
      : fail('send_prunes_stale_user_tokens', `enabledC=${enabledC}`);

    const enabledAAfterSend = await prisma.devicePushToken.count({
      where: { userId: userA.id, pushEnabled: true },
    });
    enabledAAfterSend === 1
      ? pass('user_a_still_one_after_send')
      : fail('user_a_still_one_after_send', `enabled=${enabledAAfterSend}`);

    const inbox = await req('GET', '/api/v1/push/inbox', { token: tokA });
    const ids = (inbox.json?.messages ?? []).map((m: any) => m.id);
    inbox.status === 200 && ids.includes(cid)
      ? pass('inbox_still_shows_new_campaign')
      : fail('inbox_still_shows_new_campaign', JSON.stringify(ids.slice(0, 8)));

    await req('DELETE', `/api/v1/admin/push/${cid}`, { token: adminTok });
  }

  // Cleanup test rows only.
  await prisma.devicePushToken.deleteMany({
    where: { userId: { in: [userA.id, userB.id, userC.id] } },
  });
  await prisma.deviceInstall.deleteMany({
    where: { userId: { in: [userA.id, userB.id, userC.id] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [userA.id, userB.id, userC.id] } },
  });

  const failed = checks.filter((c) => !c.ok).length;
  console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} passed`);
  await prisma.$disconnect();
  process.exit(failed ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
