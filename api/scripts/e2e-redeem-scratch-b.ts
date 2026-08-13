/**
 * Full HTTP E2E: Type B scratch-reward (coins, ad unlock, window cap) + Type A regress.
 * Run: npx ts-node --transpile-only scripts/e2e-redeem-scratch-b.ts
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

  // first scratch → coins (and likely code if window open)
  const s1 = await req('POST', `/api/v1/redeem/${scratchId}/scratch`, {
    token: tok1,
    body: { attemptKey: `att1_${stamp}` },
  });
  const coins1 = s1.json?.coinsGranted;
  s1.status < 300 && coins1 === 7
    ? pass('scratch1_coins', `code=${s1.json?.code ?? 'none'}`)
    : fail('scratch1_coins', JSON.stringify(s1.json));

  const bal1 = await prisma.user.findUniqueOrThrow({
    where: { id: user1.id },
    select: { coins: true },
  });
  bal1.coins === 107
    ? pass('wallet_after_scratch1', String(bal1.coins))
    : fail('wallet_after_scratch1', String(bal1.coins));

  // second scratch without ad → NEED_AD
  const s2blocked = await req('POST', `/api/v1/redeem/${scratchId}/scratch`, {
    token: tok1,
    body: { attemptKey: `att2_${stamp}` },
  });
  s2blocked.status >= 400 && s2blocked.json?.error?.code === 'REDEEM_NEED_AD'
    ? pass('scratch2_needs_ad')
    : fail('scratch2_needs_ad', JSON.stringify(s2blocked.json));

  // ad unlock then second scratch → coins again, no second code for same user ideally
  const unlock = await req(
    'POST',
    `/api/v1/redeem/${scratchId}/scratch-ad-unlock`,
    { token: tok1 },
  );
  unlock.status < 300 && unlock.json?.ok === true
    ? pass('ad_unlock')
    : fail('ad_unlock', JSON.stringify(unlock.json));

  const s2 = await req('POST', `/api/v1/redeem/${scratchId}/scratch`, {
    token: tok1,
    body: { attemptKey: `att2b_${stamp}` },
  });
  s2.status < 300 && s2.json?.coinsGranted === 7 && !s2.json?.code
    ? pass('scratch2_coins_only_same_user')
    : s2.status < 300 && s2.json?.coinsGranted === 7
      ? pass('scratch2_coins', `code=${s2.json?.code ?? 'none'}`)
      : fail('scratch2_coins', JSON.stringify(s2.json));

  // idempotent retry
  const s1again = await req('POST', `/api/v1/redeem/${scratchId}/scratch`, {
    token: tok1,
    body: { attemptKey: `att1_${stamp}` },
  });
  s1again.status < 300 &&
  s1again.json?.alreadyProcessed === true &&
  s1again.json?.coinsGranted === 7
    ? pass('scratch_idempotent')
    : fail('scratch_idempotent', JSON.stringify(s1again.json));

  // user2 in same window: if codesPerWindow=1 and user1 got code, user2 coins only
  const sU2 = await req('POST', `/api/v1/redeem/${scratchId}/scratch`, {
    token: tok2,
    body: { attemptKey: `u2att1_${stamp}` },
  });
  const u1gotCode = Boolean(s1.json?.code);
  if (sU2.status < 300 && sU2.json?.coinsGranted === 7) {
    if (u1gotCode && sU2.json?.code) {
      fail('window_cap', 'user2 got code but window cap is 1');
    } else {
      pass(
        'window_cap_or_pool',
        `u1code=${u1gotCode} u2code=${Boolean(sU2.json?.code)}`,
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

  // line budget for files we own this phase
  const budget: Array<[string, number]> = [
    ['api/src/redeem/redeem.service.ts', 400],
    ['api/src/redeem/redeem-admin.service.ts', 400],
    ['api/src/redeem/redeem-scratch.service.ts', 400],
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
  if (singleId) {
    await prisma.redeemCode
      .delete({ where: { id: singleId } })
      .catch(() => undefined);
  }
  await prisma.user
    .deleteMany({ where: { id: { in: [user1.id, user2.id] } } })
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
