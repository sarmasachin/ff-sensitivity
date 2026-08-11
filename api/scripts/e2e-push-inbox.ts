/**
 * Why the app Notifications page is empty — server + client parse e2e.
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

function androidParse(payload: { messages?: any[] }): string[] {
  const arr = payload?.messages ?? [];
  const ids: string[] = [];
  for (const o of arr) {
    const deep = String(o?.deepLink ?? '').trim();
    if (!deep.startsWith('ffops://')) continue;
    ids.push(String(o.id ?? ''));
  }
  return ids;
}

async function main() {
  loadEnv();
  const stamp = Date.now().toString(36);
  const adminEmail = process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';
  const admin = await prisma.admin.findUnique({ where: { email: adminEmail } });
  if (!admin || !process.env.JWT_ACCESS_SECRET || !process.env.JWT_USER_SECRET) {
    fail('admin_ready', 'missing admin/secrets');
    console.log(`\n0/${checks.length} passed`);
    await prisma.$disconnect();
    process.exit(1);
  }
  const adminTok = jwt.sign(
    { sub: admin.id, email: admin.email, role: admin.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' },
  );
  pass('admin_ready');

  const oldUser = await prisma.user.create({
    data: {
      googleSub: `e2e-inbox-old-${stamp}`,
      email: `e2e.inbox.old.${stamp}@example.com`,
      displayName: 'Inbox Old',
      isActive: true,
      createdAt: new Date(Date.now() - 2 * 24 * 3600_000),
    },
  });
  const claimUser = await prisma.user.create({
    data: {
      googleSub: `e2e-inbox-claim-${stamp}`,
      email: `e2e.inbox.claim.${stamp}@example.com`,
      displayName: 'Inbox Claim',
      isActive: true,
      createdAt: new Date(Date.now() - 2 * 24 * 3600_000),
    },
  });

  {
    const r = await req('GET', '/api/v1/push/inbox');
    r.status === 401
      ? pass('inbox_requires_user_jwt')
      : fail('inbox_requires_user_jwt', `status=${r.status}`);
  }

  const allId = `e2e_in_all_${stamp}`;
  const topicId = `e2e_in_top_${stamp}`;
  const noclaimId = `e2e_in_nc_${stamp}`;
  // Insert SENT rows only — do NOT admin-send. Live send hits real FCM
  // topic `feature_names` / leftover tokens on the phone.
  for (const body of [
    {
      id: allId,
      title: 'All inbox',
      body: 'Visible to every signed-in user after signup',
      deepLink: 'ffops://inbox',
      audience: 'ALL' as const,
      topic: '',
    },
    {
      id: topicId,
      title: 'Topic inbox',
      body: 'Only devices subscribed to e2e_unused_topic',
      deepLink: 'ffops://names',
      audience: 'TOPIC' as const,
      topic: 'e2e_unused_topic',
    },
    {
      id: noclaimId,
      title: 'No claim inbox',
      body: 'Only users who never redeemed',
      deepLink: 'ffops://redeem',
      audience: 'NO_CLAIM' as const,
      topic: '',
    },
  ]) {
    await prisma.pushCampaign.create({
      data: {
        ...body,
        status: 'SENT',
        sentAt: new Date(),
        createdBy: 'e2e',
      },
    });
    pass(`sent_${body.audience}`, `id=${body.id} db_only`);
  }

  const oldTok = userJwt(oldUser.id, oldUser.email);
  const oldInbox = await req('GET', '/api/v1/push/inbox', { token: oldTok });
  const oldIds = (oldInbox.json?.messages ?? []).map((m: any) => m.id);
  oldInbox.status === 200 && oldIds.includes(allId)
    ? pass('old_user_sees_all_campaign', `n=${oldIds.length}`)
    : fail('old_user_sees_all_campaign', JSON.stringify(oldIds));
  !oldIds.includes(topicId)
    ? pass('old_user_hides_topic_without_token')
    : fail('old_user_hides_topic_without_token');
  oldIds.includes(noclaimId)
    ? pass('old_user_sees_noclaim_without_redeem')
    : fail('old_user_sees_noclaim_without_redeem');

  const parsed = androidParse(oldInbox.json);
  parsed.includes(allId)
    ? pass('android_parser_keeps_ffops_messages')
    : fail('android_parser_keeps_ffops_messages', JSON.stringify(parsed));

  await req('POST', '/api/v1/push/device', {
    token: oldTok,
    body: {
      token: `inb${stamp}`.slice(0, 16),
      platform: 'android',
        topics: ['e2e_unused_topic', 'all_users'],
      installId: `dev_inb${stamp}`.slice(0, 28),
    },
  });
  const afterReg = await req('GET', '/api/v1/push/inbox', { token: oldTok });
  const afterIds = (afterReg.json?.messages ?? []).map((m: any) => m.id);
  afterIds.includes(topicId)
    ? pass('topic_appears_after_token_register')
    : fail('topic_appears_after_token_register', JSON.stringify(afterIds));

  const lateUser = await prisma.user.create({
    data: {
      googleSub: `e2e-inbox-late-${stamp}`,
      email: `e2e.inbox.late.${stamp}@example.com`,
      displayName: 'Inbox Late',
      isActive: true,
    },
  });
  const lateTok = userJwt(lateUser.id, lateUser.email);
  const ancientId = `e2e_in_anc_${stamp}`;
  await prisma.pushCampaign.create({
    data: {
      id: ancientId,
      title: 'Week-old blast',
      body: 'New signup must not inherit old history',
      deepLink: 'ffops://home',
      audience: 'ALL',
      topic: '',
      status: 'SENT',
      sentAt: new Date(Date.now() - 8 * 24 * 3600_000),
      createdBy: 'e2e',
    },
  });

  const lateInbox = await req('GET', '/api/v1/push/inbox', { token: lateTok });
  const lateIds = (lateInbox.json?.messages ?? []).map((m: any) => m.id);
  lateInbox.status === 200 && lateIds.includes(allId)
    ? pass('new_signup_sees_recent_all_campaign')
    : fail('new_signup_sees_recent_all_campaign', JSON.stringify(lateIds));
  !lateIds.includes(ancientId)
    ? pass('new_signup_hides_week_old_history')
    : fail('new_signup_hides_week_old_history');
  !lateIds.includes(topicId)
    ? pass('new_signup_hides_recent_topic_without_token')
    : fail('new_signup_hides_recent_topic_without_token');

  const afterId = `e2e_in_new_${stamp}`;
  await prisma.pushCampaign.create({
    data: {
      id: afterId,
      title: 'After signup',
      body: 'Must appear for the late user',
      deepLink: 'ffops://home',
      audience: 'ALL',
      topic: '',
      status: 'SENT',
      sentAt: new Date(),
      createdBy: 'e2e',
    },
  });
  const late2 = await req('GET', '/api/v1/push/inbox', { token: lateTok });
  const late2Ids = (late2.json?.messages ?? []).map((m: any) => m.id);
  late2Ids.includes(afterId)
    ? pass('late_user_sees_campaign_sent_after_signup')
    : fail('late_user_sees_campaign_sent_after_signup', JSON.stringify(late2Ids));

  const redeem = await prisma.redeemCode.create({
    data: {
      title: `e2e inbox redeem ${stamp}`,
      type: 'GOOGLE_PLAY',
      valueLabel: '₹1',
      codeSecret: `E2EINB-${stamp}`,
      status: 'ACTIVE',
      cadence: 'DAILY',
      stockLeft: 1,
      coinCost: 0,
      expiresLabel: 'E2E',
      redeemUrl: 'https://play.google.com/redeem',
    },
  });
  await prisma.redeemClaim.create({
    data: {
      userId: claimUser.id,
      redeemCodeId: redeem.id,
      codeSecret: redeem.codeSecret,
    },
  });
  const claimTok = userJwt(claimUser.id, claimUser.email);
  const claimInbox = await req('GET', '/api/v1/push/inbox', { token: claimTok });
  const claimIds = (claimInbox.json?.messages ?? []).map((m: any) => m.id);
  const claimCount = await prisma.redeemClaim.count({
    where: { userId: claimUser.id },
  });
  if (claimCount > 0) {
    !claimIds.includes(noclaimId)
      ? pass('claimed_user_hides_noclaim_campaign')
      : fail('claimed_user_hides_noclaim_campaign');
    claimIds.includes(allId)
      ? pass('claimed_user_still_sees_all_campaign')
      : fail('claimed_user_still_sees_all_campaign');
  } else {
    pass('claimed_user_hides_noclaim_campaign', 'skipped_no_claim_row');
    pass('claimed_user_still_sees_all_campaign', 'skipped_no_claim_row');
  }

  const sent = await prisma.pushCampaign.count({ where: { status: 'SENT' } });
  const users = await prisma.user.count();
  const newest = await prisma.user.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  const oldestSent = await prisma.pushCampaign.findFirst({
    where: { status: 'SENT', sentAt: { not: null } },
    orderBy: { sentAt: 'asc' },
    select: { sentAt: true, audience: true },
  });
  const hiddenForNewest =
    newest?.createdAt && oldestSent?.sentAt
      ? oldestSent.sentAt < newest.createdAt
      : false;
  console.log(
    JSON.stringify({
      local_sent_campaigns: sent,
      local_users: users,
      newest_user_after_oldest_sent: hiddenForNewest,
    }),
  );

  // Same phone, new Google account must still be able to register FCM.
  const owner = await prisma.user.create({
    data: {
      googleSub: `e2e-inbox-own-${stamp}`,
      email: `e2e.inbox.own.${stamp}@example.com`,
      displayName: 'Inbox Owner',
      isActive: true,
    },
  });
  const sharedInstall = `dev_sw${stamp}`.slice(0, 28);
  await prisma.deviceInstall.create({
    data: {
      installId: sharedInstall,
      userId: owner.id,
      hasFcmToken: true,
      pushEnabled: true,
    },
  });
  await prisma.devicePushToken.create({
    data: {
      userId: owner.id,
      token: `own${stamp}`.slice(0, 16),
      installId: sharedInstall,
      pushEnabled: true,
      topics: ['all_users'],
    },
  });
  const switchReg = await req('POST', '/api/v1/push/device', {
    token: lateTok,
    body: {
      token: `sw${stamp}xx`.slice(0, 16),
      platform: 'android',
        topics: ['e2e_unused_topic', 'all_users'],
      installId: sharedInstall,
    },
  });
  switchReg.status === 200 || switchReg.status === 201
    ? pass('new_account_can_register_on_same_phone')
    : fail(
        'new_account_can_register_on_same_phone',
        `status=${switchReg.status} ${switchReg.json?.error?.code || ''}`,
      );
  const ownerStillLive = await prisma.devicePushToken.count({
    where: { userId: owner.id, installId: sharedInstall, pushEnabled: true },
  });
  ownerStillLive === 0
    ? pass('old_account_token_disabled_on_same_phone')
    : fail('old_account_token_disabled_on_same_phone', `live=${ownerStillLive}`);

  const afterSwitch = await req('GET', '/api/v1/push/inbox', { token: lateTok });
  const afterSwitchIds = (afterSwitch.json?.messages ?? []).map((m: any) => m.id);
  afterSwitchIds.includes(topicId)
    ? pass('new_account_sees_topic_after_same_phone_register')
    : fail(
        'new_account_sees_topic_after_same_phone_register',
        JSON.stringify(afterSwitchIds),
      );

  const hijack = await req('POST', '/api/v1/devices/heartbeat', {
    token: lateTok,
    body: {
      installId: sharedInstall,
      brand: 'Google',
      model: 'Pixel',
      androidVersion: '14',
      appVersion: '1.0.0',
      appVersionCode: 1,
    },
  });
  hijack.status === 403
    ? pass('heartbeat_still_rejects_install_hijack')
    : fail('heartbeat_still_rejects_install_hijack', `status=${hijack.status}`);

  const blockedInstall = `dev_blk${stamp}`.slice(0, 28);
  await prisma.deviceInstall.create({
    data: {
      installId: blockedInstall,
      userId: lateUser.id,
      blocked: true,
      hasFcmToken: false,
      pushEnabled: false,
    },
  });
  const blockedReg = await req('POST', '/api/v1/push/device', {
    token: lateTok,
    body: {
      token: `blk${stamp}xx`.slice(0, 16),
      platform: 'android',
      installId: blockedInstall,
    },
  });
  blockedReg.status === 403
    ? pass('blocked_install_still_cannot_register_push')
    : fail(
        'blocked_install_still_cannot_register_push',
        `status=${blockedReg.status}`,
      );

  for (const id of [allId, topicId, noclaimId, afterId, ancientId]) {
    await req('DELETE', `/api/v1/admin/push/${id}`, { token: adminTok });
  }
  await prisma.devicePushToken.deleteMany({
    where: { userId: { in: [oldUser.id, lateUser.id, claimUser.id, owner.id] } },
  });
  await prisma.deviceInstall.deleteMany({
    where: {
      OR: [
        { userId: { in: [oldUser.id, lateUser.id, claimUser.id, owner.id] } },
        { installId: sharedInstall },
        { installId: blockedInstall },
      ],
    },
  });
  await prisma.redeemClaim.deleteMany({ where: { redeemCodeId: redeem.id } });
  await prisma.redeemCode.delete({ where: { id: redeem.id } }).catch(() => undefined);
  await prisma.user.deleteMany({
    where: { id: { in: [oldUser.id, lateUser.id, claimUser.id, owner.id] } },
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
