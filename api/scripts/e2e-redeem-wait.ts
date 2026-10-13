/**
 * Scratch WAIT deadline: admin windowMinutes after the last scratch,
 * and the card start time when the schedule has not opened.
 * Run: npx ts-node --transpile-only scripts/e2e-redeem-wait.ts
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

const checks: { name: string; ok: boolean }[] = [];
function pass(name: string, detail?: string) {
  checks.push({ name, ok: true });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name: string, detail?: string) {
  checks.push({ name, ok: false });
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

function item(json: any, id: string) {
  return (json?.items ?? []).find((row: any) => row.id === id);
}

async function main() {
  loadEnv();
  const stamp = Date.now();
  const admin = await prisma.admin.findFirst({
    where: { email: process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com', isActive: true },
  });
  if (!admin || !process.env.JWT_ACCESS_SECRET || !process.env.JWT_USER_SECRET) {
    fail('bootstrap');
    process.exit(1);
  }
  const adminTok = jwt.sign(
    { sub: admin.id, email: admin.email, role: admin.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '20m' },
  );
  const user = await prisma.user.create({
    data: {
      email: `e2e.wait.${stamp}@example.com`,
      displayName: 'Wait Timer',
      googleSub: `sub_wait_${stamp}`,
      coins: 10,
      isActive: true,
    },
  });
  const token = jwt.sign(
    { sub: user.id, email: user.email, aud: 'user', tv: 0 },
    process.env.JWT_USER_SECRET,
    { expiresIn: '1h' },
  );

  const windowMinutes = 45;
  const created: string[] = [];
  try {
    const open = await req('POST', '/api/v1/admin/redeem', {
      token: adminTok,
      body: {
        mode: 'SCRATCH_REWARD',
        title: `E2E Wait ${stamp}`,
        type: 'GOOGLE_PLAY',
        valueLabel: 'Coins',
        codePool: [`WAIT-${stamp}-A`, `WAIT-${stamp}-B`],
        status: 'ACTIVE',
        cadence: 'DAILY',
        coinRewardMin: 3,
        coinRewardMax: 3,
        windowMinutes,
        codesPerWindow: 1,
        startsAt: new Date(Date.now() - 60_000).toISOString(),
        endsAt: new Date(Date.now() + 2 * 24 * 3600_000).toISOString(),
        tip: 'Scratch to earn Coins.',
        redeemUrl: 'https://play.google.com/redeem',
        expiresLabel: 'Schedule',
      },
    });
    const openId = open.json?.id as string | undefined;
    if (!(open.status < 300 && openId)) {
      fail('create_open', JSON.stringify(open.json));
      return;
    }
    created.push(openId);
    pass('create_open', openId);

    const fresh = await req('GET', '/api/v1/redeem/catalog', { token });
    const freshHit = item(fresh.json, openId);
    fresh.status === 200 &&
    freshHit?.canScratch === true &&
    freshHit?.needsAd === false &&
    freshHit?.waitUntil == null &&
    freshHit?.waitNext == null
      ? pass('fresh_no_wait')
      : fail('fresh_no_wait', JSON.stringify(freshHit));

    const scratchedAt = new Date(Date.now() - 10 * 60_000);
    await prisma.redeemScratchRoll.create({
      data: {
        userId: user.id,
        redeemCodeId: openId,
        attemptKey: `wait_${stamp}`,
        coinsGranted: 3,
        createdAt: scratchedAt,
      },
    });
    const locked = await req('GET', '/api/v1/redeem/catalog', { token });
    const lockedHit = item(locked.json, openId);
    const expectUntil = scratchedAt.getTime() + windowMinutes * 60_000;
    const gotUntil = Date.parse(lockedHit?.waitUntil ?? '');
    const delta = Math.abs(gotUntil - expectUntil);
    lockedHit?.canScratch === false &&
    lockedHit?.needsAd === false &&
    lockedHit?.waitNext === 'AD' &&
    delta < 1500
      ? pass('cooldown_deadline', `${lockedHit.waitUntil} delta=${delta}`)
      : fail('cooldown_deadline', JSON.stringify(lockedHit));

    const during = await req('POST', `/api/v1/redeem/${openId}/scratch`, {
      token,
      body: { attemptKey: `waitblock_${stamp}` },
    });
    during.status >= 400 && during.json?.error?.code === 'REDEEM_WINDOW_DONE'
      ? pass('scratch_blocked_during_countdown')
      : fail('scratch_blocked_during_countdown', JSON.stringify(during.json));

    const earlyAd = await req('POST', `/api/v1/redeem/${openId}/scratch-ad-unlock`, {
      token,
    });
    const still = await req('GET', '/api/v1/redeem/catalog', { token });
    const stillHit = item(still.json, openId);
    earlyAd.status < 300 &&
    earlyAd.json?.needsAd === false &&
    stillHit?.canScratch === false &&
    stillHit?.waitNext === 'AD' &&
    Math.abs(Date.parse(stillHit?.waitUntil ?? '') - expectUntil) < 1500
      ? pass('ad_does_not_skip_countdown')
      : fail(
          'ad_does_not_skip_countdown',
          JSON.stringify({ earlyAd: earlyAd.json, stillHit }),
        );

    await prisma.redeemScratchPass.create({
      data: { userId: user.id, redeemCodeId: openId, allowedAttempts: 2 },
    });
    const extra = await req('GET', '/api/v1/redeem/catalog', { token });
    const extraHit = item(extra.json, openId);
    extraHit?.waitNext === 'SCRATCH' && extraHit?.waitUntil
      ? pass('cooldown_next_scratch')
      : fail('cooldown_next_scratch', JSON.stringify(extraHit));
    await prisma.redeemScratchPass.deleteMany({
      where: { userId: user.id, redeemCodeId: openId },
    });

    await prisma.redeemScratchRoll.updateMany({
      where: { userId: user.id, redeemCodeId: openId },
      data: { createdAt: new Date(Date.now() - (windowMinutes + 1) * 60_000) },
    });
    const done = await req('GET', '/api/v1/redeem/catalog', { token });
    const doneHit = item(done.json, openId);
    doneHit?.waitUntil == null &&
    doneHit?.waitNext == null &&
    doneHit?.needsAd === true &&
    doneHit?.canScratch === false
      ? pass('cooldown_over_needs_ad')
      : fail('cooldown_over_needs_ad', JSON.stringify(doneHit));

    const needAd = await req('POST', `/api/v1/redeem/${openId}/scratch`, {
      token,
      body: { attemptKey: `waitneed_${stamp}` },
    });
    needAd.status >= 400 && needAd.json?.error?.code === 'REDEEM_NEED_AD'
      ? pass('scratch_needs_ad_after_countdown')
      : fail('scratch_needs_ad_after_countdown', JSON.stringify(needAd.json));

    const unlock = await req('POST', `/api/v1/redeem/${openId}/scratch-ad-unlock`, {
      token,
    });
    const afterAd = await req('POST', `/api/v1/redeem/${openId}/scratch`, {
      token,
      body: { attemptKey: `waitok_${stamp}` },
    });
    unlock.status < 300 &&
    unlock.json?.needsAd === false &&
    afterAd.status < 300 &&
    typeof afterAd.json?.coinsGranted === 'number'
      ? pass('ad_then_scratch', `coins=${afterAd.json?.coinsGranted}`)
      : fail(
          'ad_then_scratch',
          JSON.stringify({ unlock: unlock.json, afterAd: afterAd.json }),
        );

    const startsAt = new Date(Date.now() + 20 * 60_000);
    const future = await req('POST', '/api/v1/admin/redeem', {
      token: adminTok,
      body: {
        mode: 'SCRATCH_REWARD',
        title: `E2E Wait Future ${stamp}`,
        type: 'GOOGLE_PLAY',
        valueLabel: 'Coins',
        codePool: [`WAITF-${stamp}-A`],
        status: 'ACTIVE',
        cadence: 'WEEKLY',
        coinRewardMin: 2,
        coinRewardMax: 2,
        windowMinutes: 30,
        codesPerWindow: 1,
        startsAt: startsAt.toISOString(),
        endsAt: new Date(Date.now() + 3 * 24 * 3600_000).toISOString(),
        tip: 'Scratch to earn Coins.',
        redeemUrl: 'https://play.google.com/redeem',
        expiresLabel: 'Schedule',
      },
    });
    const futureId = future.json?.id as string | undefined;
    if (!(future.status < 300 && futureId)) {
      fail('create_future', JSON.stringify(future.json));
      return;
    }
    created.push(futureId);
    const futureCat = await req('GET', '/api/v1/redeem/catalog', { token });
    const futureHit = item(futureCat.json, futureId);
    const futureDelta = Math.abs(Date.parse(futureHit?.waitUntil ?? '') - startsAt.getTime());
    futureHit?.waitNext === 'SCRATCH' &&
    futureHit?.canScratch === false &&
    futureDelta < 1500
      ? pass('not_started_deadline', futureHit?.waitUntil)
      : fail('not_started_deadline', JSON.stringify(futureHit));

    const single = await req('POST', '/api/v1/admin/redeem', {
      token: adminTok,
      body: {
        mode: 'SINGLE',
        title: `E2E Wait Single ${stamp}`,
        type: 'GOOGLE_PLAY',
        valueLabel: '₹1',
        codeSecret: `WAITSINGLE${stamp}`,
        status: 'ACTIVE',
        cadence: 'DAILY',
        stockLeft: 1,
        tip: 'First Come, First Serve!',
        redeemUrl: 'https://play.google.com/redeem',
        expiresLabel: 'E2E',
      },
    });
    const singleId = single.json?.id as string | undefined;
    if (singleId) created.push(singleId);
    const singleCat = await req('GET', '/api/v1/redeem/catalog', { token });
    const singleHit = item(singleCat.json, singleId ?? '');
    singleHit && singleHit.waitUntil == null && singleHit.waitNext == null
      ? pass('single_no_wait')
      : fail('single_no_wait', JSON.stringify(singleHit));
  } finally {
    if (created.length) {
      await prisma.redeemCode.deleteMany({ where: { id: { in: created } } });
    }
    await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
  }

  const bad = checks.filter((c) => !c.ok);
  console.log(bad.length ? `FAIL ${bad.length}/${checks.length}` : `ALL_PASS ${checks.length}`);
  if (bad.length) process.exit(1);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
