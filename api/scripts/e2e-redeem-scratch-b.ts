/**
 * Full HTTP E2E: Type B scratch-reward (coins, ad unlock, window cap) + Type A regress.
 * Run: npx ts-node --transpile-only scripts/e2e-redeem-scratch-b.ts
 */
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import {
  isScratchCooldownActive,
  rollScratchCoins,
  scratchCodeWinChance,
  shouldAwardScratchCode,
} from '../src/redeem/redeem-scratch-math';

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

type Check = { name: string; ok: boolean };
const checks: Check[] = [];
function pass(name: string, detail?: string) {
  checks.push({ name, ok: true });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name: string, detail?: string) {
  checks.push({ name, ok: false });
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

function exclusiveScratch(json: any, coinIfNoCode: number): boolean {
  if (!json || typeof json.coinsGranted !== 'number') return false;
  if (json.code) return json.coinsGranted === 0;
  return json.coinsGranted === coinIfNoCode;
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

function lineCount(rel: string) {
  const full = path.join(__dirname, '..', '..', rel);
  return fs.readFileSync(full, 'utf8').split(/\r?\n/).length;
}

async function main() {
  loadEnv();
  const stamp = Date.now().toString();
  const admin = await prisma.admin.findFirst({
    where: {
      email: process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com',
      isActive: true,
    },
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

  const now = new Date();
  const firstUserChance = scratchCodeWinChance({
    remainingSlots: 1,
    scratchesInWindow: 0,
    remainingMs: 30 * 60 * 1000,
  });
  firstUserChance > 0 && firstUserChance < 0.1
    ? pass('code_chance_first_not_guaranteed', String(firstUserChance))
    : fail('code_chance_first_not_guaranteed', String(firstUserChance));
  scratchCodeWinChance({
    remainingSlots: 0,
    scratchesInWindow: 10,
    remainingMs: 30 * 60 * 1000,
  }) === 0
    ? pass('code_chance_no_slots')
    : fail('code_chance_no_slots');
  isScratchCooldownActive(now, 30, now)
    ? pass('wait_30min_lock')
    : fail('wait_30min_lock');
  !isScratchCooldownActive(new Date(now.getTime() - 31 * 60 * 1000), 30, now)
    ? pass('wait_30min_opens')
    : fail('wait_30min_opens');
  isScratchCooldownActive(new Date(now.getTime() - 59 * 60 * 1000), 60, now)
    ? pass('wait_60min_lock')
    : fail('wait_60min_lock');
  !shouldAwardScratchCode(
    {
      remainingSlots: 1,
      scratchesInWindow: 0,
      remainingMs: 30 * 60 * 1000,
    },
    () => 0.5,
  )
    ? pass('code_chance_first_not_autowin')
    : fail('code_chance_first_not_autowin');

  const rollHist = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 10_000; i += 1) {
    const n = rollScratchCoins(1, 5);
    if (n >= 1 && n <= 5) rollHist[n] += 1;
  }
  const rollOk =
    rollHist[1] >= 1500 &&
    rollHist[2] >= 1500 &&
    rollHist[3] >= 1500 &&
    rollHist[4] >= 1500 &&
    rollHist[5] >= 1500 &&
    rollHist.reduce((a, b) => a + b, 0) === 10_000;
  rollOk
    ? pass(
        'coin_roll_1_to_5_fair',
        `1=${rollHist[1]} 2=${rollHist[2]} 3=${rollHist[3]} 4=${rollHist[4]} 5=${rollHist[5]}`,
      )
    : fail(
        'coin_roll_1_to_5_fair',
        `1=${rollHist[1]} 2=${rollHist[2]} 3=${rollHist[3]} 4=${rollHist[4]} 5=${rollHist[5]}`,
      );

  const liveCards = await prisma.redeemCode.findMany({
    where: { mode: 'SCRATCH_REWARD' },
    select: {
      title: true,
      status: true,
      coinRewardMin: true,
      coinRewardMax: true,
    },
    take: 20,
  });
  pass(
    'live_scratch_minmax',
    liveCards
      .map(
        (c) =>
          `${c.status} min=${c.coinRewardMin} max=${c.coinRewardMax} ${c.title}`,
      )
      .join(' | ') || 'none',
  );

  const codeA = `TYPEA${stamp}SINGLE1`;
  const codeB1 = `TYPEB${stamp}POOL001`;
  const codeB2 = `TYPEB${stamp}POOL002`;

  // --- Type A regression ---
  const single = await req('POST', '/api/v1/admin/redeem', {
    token: adminTok,
    body: {
      mode: 'SINGLE',
      title: `E2E Single ${stamp}`,
      type: 'GOOGLE_PLAY',
      valueLabel: '₹1',
      codeSecret: codeA,
      status: 'ACTIVE',
      cadence: 'DAILY',
      stockLeft: 1,
      tip: 'First Come, First Serve!',
      redeemUrl: 'https://play.google.com/redeem',
      expiresLabel: 'E2E',
    },
  });
  const singleId = single.json?.id as string | undefined;
  single.status < 300 && singleId
    ? pass('type_a_create', singleId)
    : fail('type_a_create', JSON.stringify(single.json));

  // --- Type B create ---
  const scratch = await req('POST', '/api/v1/admin/redeem', {
    token: adminTok,
    body: {
      mode: 'SCRATCH_REWARD',
      title: `E2E Scratch ${stamp}`,
      type: 'GOOGLE_PLAY',
      valueLabel: 'Coins + limited',
      codePool: [codeB1, codeB2],
      status: 'ACTIVE',
      cadence: 'DAILY',
      coinRewardMin: 7,
      coinRewardMax: 7,
      windowMinutes: 30,
      codesPerWindow: 1,
      startsAt: new Date(Date.now() - 60_000).toISOString(),
      endsAt: new Date(Date.now() + 2 * 24 * 3600_000).toISOString(),
      tip: 'Scratch to earn Coins. Limited reward codes distributed via schedule.',
      redeemUrl: 'https://play.google.com/redeem',
      expiresLabel: 'Schedule',
    },
  });
  const scratchId = scratch.json?.id as string | undefined;
  scratch.status < 300 && scratchId && scratch.json?.mode === 'SCRATCH_REWARD'
    ? pass('type_b_create', `${scratchId} pool=${scratch.json?.poolLeft}`)
    : fail('type_b_create', JSON.stringify(scratch.json));

  const tipOk =
    typeof scratch.json?.tip === 'string' &&
    /coins/i.test(scratch.json.tip) &&
    !/watch ad.*(?:gift|redeem) code/i.test(scratch.json.tip);
  tipOk ? pass('type_b_safe_tip') : fail('type_b_safe_tip', scratch.json?.tip);

  const user1 = await prisma.user.create({
    data: {
      email: `e2e.scratch.b1.${stamp}@example.com`,
      displayName: 'Scratch B1',
      googleSub: `sub_scratch_b1_${stamp}`,
      coins: 100,
      isActive: true,
    },
  });
  const user2 = await prisma.user.create({
    data: {
      email: `e2e.scratch.b2.${stamp}@example.com`,
      displayName: 'Scratch B2',
      googleSub: `sub_scratch_b2_${stamp}`,
      coins: 100,
      isActive: true,
    },
  });
  const tok1 = jwt.sign(
    { sub: user1.id, email: user1.email, aud: 'user', tv: 0 },
    process.env.JWT_USER_SECRET!,
    { expiresIn: '1h' },
  );
  const tok2 = jwt.sign(
    { sub: user2.id, email: user2.email, aud: 'user', tv: 0 },
    process.env.JWT_USER_SECRET!,
    { expiresIn: '1h' },
  );

  const catalog = await req('GET', '/api/v1/redeem/catalog', { token: tok1 });
  const hit = (catalog.json?.items ?? []).find((i: any) => i.id === scratchId);
  catalog.status === 200 &&
  hit?.mode === 'SCRATCH_REWARD' &&
  hit?.canScratch === true &&
  hit?.needsAd === false
    ? pass('catalog_type_b_flags')
    : fail('catalog_type_b_flags', JSON.stringify(hit));

  // claim endpoint must reject Type B
  const badClaim = await req('POST', `/api/v1/redeem/${scratchId}/claim`, {
    token: tok1,
  });
  badClaim.status >= 400 && badClaim.json?.error?.code === 'REDEEM_USE_SCRATCH'
    ? pass('type_b_claim_blocked')
    : fail('type_b_claim_blocked', JSON.stringify(badClaim));

  // first scratch → coins XOR code
  const s1 = await req('POST', `/api/v1/redeem/${scratchId}/scratch`, {
    token: tok1,
    body: { attemptKey: `att1_${stamp}` },
  });
  const coins1 = s1.json?.coinsGranted;
  s1.status < 300 && exclusiveScratch(s1.json, 7)
    ? pass('scratch1_exclusive', `coins=${coins1} code=${s1.json?.code ?? 'none'}`)
    : fail('scratch1_exclusive', JSON.stringify(s1.json));

  const bal1 = await prisma.user.findUniqueOrThrow({
    where: { id: user1.id },
    select: { coins: true },
  });
  const expectBal1 = s1.json?.code ? 100 : 107;
  bal1.coins === expectBal1
    ? pass('wallet_after_scratch1', String(bal1.coins))
    : fail('wallet_after_scratch1', `${bal1.coins} vs ${expectBal1}`);

  const afterScratch = await req('GET', '/api/v1/redeem/catalog', {
    token: tok1,
  });
  const hitWait = (afterScratch.json?.items ?? []).find(
    (i: { id?: string }) => i.id === scratchId,
  );
  afterScratch.status === 200 &&
  hitWait?.canScratch === false &&
  hitWait?.needsAd === false
    ? pass(
        'winner_or_scratcher_waits_admin_window',
        `code=${Boolean(s1.json?.code)}`,
      )
    : fail(
        'winner_or_scratcher_waits_admin_window',
        JSON.stringify(hitWait),
      );

  // second scratch same window → blocked (time window, not ads)
  const s2blocked = await req('POST', `/api/v1/redeem/${scratchId}/scratch`, {
    token: tok1,
    body: { attemptKey: `att2_${stamp}` },
  });
  s2blocked.status >= 400 && s2blocked.json?.error?.code === 'REDEEM_WINDOW_DONE'
    ? pass('scratch2_same_window_blocked')
    : fail('scratch2_same_window_blocked', JSON.stringify(s2blocked.json));

  // ad unlock must not grant extra scratches in the same window
  const unlock = await req(
    'POST',
    `/api/v1/redeem/${scratchId}/scratch-ad-unlock`,
    { token: tok1 },
  );
  unlock.status < 300 && unlock.json?.ok === true && unlock.json?.needsAd === false
    ? pass('ad_unlock_noop')
    : fail('ad_unlock_noop', JSON.stringify(unlock.json));

  const s2 = await req('POST', `/api/v1/redeem/${scratchId}/scratch`, {
    token: tok1,
    body: { attemptKey: `att2b_${stamp}` },
  });
  s2.status >= 400 && s2.json?.error?.code === 'REDEEM_WINDOW_DONE'
    ? pass('scratch2_still_blocked_after_ad')
    : fail('scratch2_still_blocked_after_ad', JSON.stringify(s2.json));

  // After admin window: must watch ad, then coins again
  await prisma.redeemScratchRoll.updateMany({
    where: { userId: user1.id, redeemCodeId: scratchId },
    data: { createdAt: new Date(Date.now() - 40 * 60_000) },
  });
  const needAd = await req('POST', `/api/v1/redeem/${scratchId}/scratch`, {
    token: tok1,
    body: { attemptKey: `att3_${stamp}` },
  });
  needAd.status >= 400 && needAd.json?.error?.code === 'REDEEM_NEED_AD'
    ? pass('next_window_needs_ad')
    : fail('next_window_needs_ad', JSON.stringify(needAd.json));

  const unlockNext = await req(
    'POST',
    `/api/v1/redeem/${scratchId}/scratch-ad-unlock`,
    { token: tok1 },
  );
  unlockNext.status < 300 && unlockNext.json?.alreadyAllowed === false
    ? pass('next_window_ad_unlock')
    : fail('next_window_ad_unlock', JSON.stringify(unlockNext.json));

  const s3 = await req('POST', `/api/v1/redeem/${scratchId}/scratch`, {
    token: tok1,
    body: { attemptKey: `att3b_${stamp}` },
  });
  s3.status < 300 && exclusiveScratch(s3.json, 7)
    ? pass(
        'next_window_exclusive_after_ad',
        `coins=${s3.json?.coinsGranted} code=${s3.json?.code ?? 'none'}`,
      )
    : fail('next_window_exclusive_after_ad', JSON.stringify(s3.json));

  // idempotent retry
  const s1again = await req('POST', `/api/v1/redeem/${scratchId}/scratch`, {
    token: tok1,
    body: { attemptKey: `att1_${stamp}` },
  });
  s1again.status < 300 &&
  s1again.json?.alreadyProcessed === true &&
  s1again.json?.coinsGranted === coins1 &&
  Boolean(s1again.json?.code) === Boolean(s1.json?.code)
    ? pass('scratch_idempotent')
    : fail('scratch_idempotent', JSON.stringify(s1again.json));

  // user2 in same window: if codesPerWindow=1 and user1 got code, user2 coins only
  const sU2 = await req('POST', `/api/v1/redeem/${scratchId}/scratch`, {
    token: tok2,
    body: { attemptKey: `u2att1_${stamp}` },
  });
  const u1gotCode = Boolean(s1.json?.code);
  if (sU2.status < 300 && exclusiveScratch(sU2.json, 7)) {
    if (u1gotCode && sU2.json?.code) {
      fail('window_cap', 'user2 got code but window cap is 1');
    } else {
      pass(
        'window_cap_or_pool',
        `u1code=${u1gotCode} u2code=${Boolean(sU2.json?.code)} u2coins=${sU2.json?.coinsGranted}`,
      );
    }
  } else {
    fail('window_cap_or_pool', JSON.stringify(sU2.json));
  }

  // Type A claim still works
  const claimA = await req('POST', `/api/v1/redeem/${singleId}/claim`, {
    token: tok2,
  });
  claimA.status < 300 && claimA.json?.code === codeA
    ? pass('type_a_claim_regress')
    : fail('type_a_claim_regress', JSON.stringify(claimA.json));

  // Coin range 1–5: grant is random in range, not the admin valueLabel
  const codeRange = `RANGE${stamp}POOL1`;
  const rangeCard = await req('POST', '/api/v1/admin/redeem', {
    token: adminTok,
    body: {
      mode: 'SCRATCH_REWARD',
      title: `E2E Scratch range ${stamp}`,
      type: 'GOOGLE_PLAY',
      valueLabel: '10',
      codePool: [codeRange],
      status: 'ACTIVE',
      cadence: 'DAILY',
      coinRewardMin: 1,
      coinRewardMax: 5,
      windowMinutes: 30,
      codesPerWindow: 1,
      startsAt: new Date(Date.now() - 60_000).toISOString(),
      endsAt: new Date(Date.now() + 2 * 24 * 3600_000).toISOString(),
      tip: 'Scratch to earn Coins. Limited reward codes distributed via schedule.',
      redeemUrl: 'https://play.google.com/redeem',
      expiresLabel: 'Schedule',
    },
  });
  const rangeId = rangeCard.json?.id as string | undefined;
  const user3 = await prisma.user.create({
    data: {
      email: `e2e.scratch.b3.${stamp}@example.com`,
      displayName: 'Scratch B3',
      googleSub: `sub_scratch_b3_${stamp}`,
      coins: 0,
      isActive: true,
    },
  });
  const tok3 = jwt.sign(
    { sub: user3.id, email: user3.email, aud: 'user', tv: 0 },
    process.env.JWT_USER_SECRET!,
    { expiresIn: '1h' },
  );
  const sRange = rangeId
    ? await req('POST', `/api/v1/redeem/${rangeId}/scratch`, {
        token: tok3,
        body: { attemptKey: `range_${stamp}` },
      })
    : { status: 0, json: null };
  const rangeCoins = sRange.json?.coinsGranted;
  const rangeCode = sRange.json?.code;
  const rangeOk =
    sRange.status < 300 &&
    typeof rangeCoins === 'number' &&
    (rangeCode
      ? rangeCoins === 0
      : rangeCoins >= 1 && rangeCoins <= 5 && rangeCoins !== 10);
  rangeOk
    ? pass(
        'scratch_exclusive_range',
        `coins=${rangeCoins} code=${rangeCode ?? 'none'}`,
      )
    : fail('scratch_exclusive_range', JSON.stringify(sRange.json));
  const bal3 = await prisma.user.findUniqueOrThrow({
    where: { id: user3.id },
    select: { coins: true },
  });
  bal3.coins === rangeCoins
    ? pass('wallet_matches_granted', String(bal3.coins))
    : fail('wallet_matches_granted', `${bal3.coins} vs ${rangeCoins}`);
  if (rangeCode) {
    rangeCode === codeRange && !String(rangeCode).includes('•')
      ? pass('scratch_full_code_not_dots', rangeCode)
      : fail('scratch_full_code_not_dots', String(rangeCode));
  } else {
    pass('scratch_coins_only_no_dots');
  }

  // Forced code win: coins must be 0 (never both).
  const codeBoth = `BOTH${stamp}POOL1`;
  const bothCard = await req('POST', '/api/v1/admin/redeem', {
    token: adminTok,
    body: {
      mode: 'SCRATCH_REWARD',
      title: `E2E Scratch both ${stamp}`,
      type: 'GOOGLE_PLAY',
      valueLabel: 'Coins + code',
      codePool: [codeBoth],
      status: 'ACTIVE',
      cadence: 'DAILY',
      coinRewardMin: 4,
      coinRewardMax: 4,
      windowMinutes: 30,
      codesPerWindow: 20,
      startsAt: new Date(Date.now() - 29.5 * 60_000).toISOString(),
      endsAt: new Date(Date.now() + 2 * 24 * 3600_000).toISOString(),
      tip: 'Scratch to earn Coins. Limited reward codes distributed via schedule.',
      redeemUrl: 'https://play.google.com/redeem',
      expiresLabel: 'Schedule',
    },
  });
  const bothId = bothCard.json?.id as string | undefined;
  const user4 = await prisma.user.create({
    data: {
      email: `e2e.scratch.b4.${stamp}@example.com`,
      displayName: 'Scratch B4',
      googleSub: `sub_scratch_b4_${stamp}`,
      coins: 0,
      isActive: true,
    },
  });
  const tok4 = jwt.sign(
    { sub: user4.id, email: user4.email, aud: 'user', tv: 0 },
    process.env.JWT_USER_SECRET!,
    { expiresIn: '1h' },
  );
  const sBoth = bothId
    ? await req('POST', `/api/v1/redeem/${bothId}/scratch`, {
        token: tok4,
        body: { attemptKey: `both_${stamp}` },
      })
    : { status: 0, json: null };
  const bal4 = await prisma.user.findUniqueOrThrow({
    where: { id: user4.id },
    select: { coins: true },
  });
  sBoth.status < 300 &&
  sBoth.json?.coinsGranted === 0 &&
  sBoth.json?.code === codeBoth &&
  sBoth.json?.coinsRemaining === 0 &&
  bal4.coins === 0
    ? pass(
        'code_without_coins',
        `coins=${sBoth.json?.coinsGranted} code=${sBoth.json?.code}`,
      )
    : fail(
        'code_without_coins',
        `${JSON.stringify(sBoth.json)} wallet=${bal4.coins}`,
      );

  const led4 = await prisma.walletLedger.count({
    where: { userId: user4.id, reason: 'earn:redeem_scratch' },
  });
  led4 === 0
    ? pass('code_win_no_coin_ledger')
    : fail('code_win_no_coin_ledger', String(led4));

  const afterCode = await req('GET', '/api/v1/redeem/catalog', {
    token: tok4,
  });
  const hitCodeWait = (afterCode.json?.items ?? []).find(
    (i: { id?: string }) => i.id === bothId,
  );
  afterCode.status === 200 &&
  hitCodeWait?.canScratch === false &&
  hitCodeWait?.needsAd === false
    ? pass('code_winner_waits_admin_window')
    : fail('code_winner_waits_admin_window', JSON.stringify(hitCodeWait));

  const sBoth2 = bothId
    ? await req('POST', `/api/v1/redeem/${bothId}/scratch`, {
        token: tok4,
        body: { attemptKey: `both2_${stamp}` },
      })
    : { status: 0, json: null };
  sBoth2.status >= 400 && sBoth2.json?.error?.code === 'REDEEM_WINDOW_DONE'
    ? pass('code_winner_second_scratch_blocked')
    : fail('code_winner_second_scratch_blocked', JSON.stringify(sBoth2.json));

  const user5 = await prisma.user.create({
    data: {
      email: `e2e.scratch.b5.${stamp}@example.com`,
      displayName: 'Scratch B5',
      googleSub: `sub_scratch_b5_${stamp}`,
      coins: 10,
      isActive: true,
    },
  });
  const tok5 = jwt.sign(
    { sub: user5.id, email: user5.email, aud: 'user', tv: 0 },
    process.env.JWT_USER_SECRET!,
    { expiresIn: '1h' },
  );
  const sNext = bothId
    ? await req('POST', `/api/v1/redeem/${bothId}/scratch`, {
        token: tok5,
        body: { attemptKey: `next_${stamp}` },
      })
    : { status: 0, json: null };
  const bal5 = await prisma.user.findUniqueOrThrow({
    where: { id: user5.id },
    select: { coins: true },
  });
  sNext.status < 300 &&
  sNext.json?.coinsGranted === 4 &&
  !sNext.json?.code &&
  bal5.coins === 14
    ? pass(
        'next_user_coins_only_after_code_taken',
        `coins=${sNext.json?.coinsGranted}`,
      )
    : fail(
        'next_user_coins_only_after_code_taken',
        `${JSON.stringify(sNext.json)} wallet=${bal5.coins}`,
      );

  const cardUi = fs.readFileSync(
    path.join(__dirname, '..', '..', 'app/src/main/java/com/ffsensitivity/app/presentation/screens/RedeemScratchCard.kt'),
    'utf8',
  );
  const claimUi = fs.readFileSync(
    path.join(__dirname, '..', '..', 'app/src/main/java/com/ffsensitivity/app/presentation/screens/RedeemScreenClaim.kt'),
    'utf8',
  );
  !cardUi.includes('COINS + CODE') &&
  !cardUi.includes('bonus code') &&
  !claimUi.includes('bonus code')
    ? pass('ui_no_dual_prize_copy')
    : fail('ui_no_dual_prize_copy');

  // line budget for files we own this phase
  const budget: Array<[string, number]> = [
    ['api/src/redeem/redeem.service.ts', 400],
    ['api/src/redeem/redeem-admin.service.ts', 400],
    ['api/src/redeem/redeem-scratch.service.ts', 400],
    ['api/src/redeem/redeem-scratch-pass.service.ts', 400],
    ['api/src/redeem/redeem-scratch-guards.ts', 200],
    ['api/src/redeem/redeem-claims.service.ts', 400],
    ['api/src/redeem/redeem-admin-pool.service.ts', 400],
    ['admin/src/components/redeem/RedeemFormModal.tsx', 400],
  ];
  for (const [rel, max] of budget) {
    const n = lineCount(rel);
    n <= max
      ? pass(`lines_${path.basename(rel)}`, `${n}/${max}`)
      : fail(`lines_${path.basename(rel)}`, `${n}/${max}`);
  }

  // cleanup
  if (scratchId) {
    await prisma.redeemCode
      .delete({ where: { id: scratchId } })
      .catch(() => undefined);
  }
  if (rangeId) {
    await prisma.redeemCode
      .delete({ where: { id: rangeId } })
      .catch(() => undefined);
  }
  if (bothId) {
    await prisma.redeemCode
      .delete({ where: { id: bothId } })
      .catch(() => undefined);
  }
  if (singleId) {
    await prisma.redeemCode
      .delete({ where: { id: singleId } })
      .catch(() => undefined);
  }
  await prisma.user
    .deleteMany({
      where: { id: { in: [user1.id, user2.id, user3.id, user4.id, user5.id] } },
    })
    .catch(() => undefined);

  // also purge any older smoke leftovers from this suite naming
  await prisma.redeemCode
    .deleteMany({
      where: {
        OR: [
          { title: { startsWith: 'E2E Scratch' } },
          { title: { startsWith: 'E2E Single' } },
        ],
      },
    })
    .catch(() => undefined);
  const failed = checks.filter((c) => !c.ok).length;
  console.log(`\n${checks.length - failed}/${checks.length} passed`);
  if (failed) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
