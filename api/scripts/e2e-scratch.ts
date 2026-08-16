/**
 * Scratch admin + daily roll e2e / security (local Postgres).
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
    json = { raw: text };
  }
  return { status: res.status, json };
}

async function main() {
  loadEnv();
  const userSecret = process.env.JWT_USER_SECRET!;
  const adminEmail = process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';
  const day = new Date().toISOString().slice(0, 10);

  const user = await prisma.user.upsert({
    where: { email: 'e2e.scratch@example.com' },
    update: { isActive: true, coins: 20, lastCheckinDay: day, streakDays: 1 },
    create: {
      googleSub: 'e2e-scratch-sub',
      email: 'e2e.scratch@example.com',
      displayName: 'E2E Scratch',
      isActive: true,
      coins: 20,
      lastCheckinDay: day,
      streakDays: 1,
    },
  });
  await prisma.scratchRoll.deleteMany({ where: { userId: user.id, dayKey: day } });
  await prisma.walletLedger.deleteMany({
    where: {
      userId: user.id,
      idempotencyKey: { startsWith: `earn:scratch:${user.id}:${day}` },
    },
  });

  // Force coins-only odds for deterministic e2e
  await prisma.scratchConfig.upsert({
    where: { id: 'default' },
    update: {
      coinsPercent: 100,
      redeemPercent: 0,
      coinAmount: 40,
      retentionDays: 30,
    },
    create: {
      id: 'default',
      coinsPercent: 100,
      redeemPercent: 0,
      coinAmount: 40,
      retentionDays: 30,
      autoPurge: true,
      showExpired: false,
    },
  });

  const userToken = jwt.sign(
    { sub: user.id, email: user.email, aud: 'user' },
    userSecret,
    { expiresIn: '1h' },
  );

  {
    const r = await req('GET', '/api/v1/admin/scratch');
    r.status === 401
      ? pass('admin scratch requires auth')
      : fail('admin scratch requires auth', `HTTP ${r.status}`);
  }
  {
    const r = await req('GET', '/api/v1/admin/scratch', { token: userToken });
    r.status === 401
      ? pass('user JWT blocked on admin scratch')
      : fail('user JWT blocked on admin scratch', `HTTP ${r.status}`);
  }
  {
    const r = await req('POST', '/api/v1/scratch/roll');
    r.status === 401
      ? pass('roll requires auth')
      : fail('roll requires auth', `HTTP ${r.status}`);
  }

  // Admin API auth: mint JWT (password login is cookie/OTP — not headless).
  const adminRow = await prisma.admin.findFirst({
    where: {
      email: adminEmail.trim().toLowerCase(),
      isActive: true,
    },
  });
  const adminToken = adminRow
    ? jwt.sign(
        { sub: adminRow.id, email: adminRow.email, role: adminRow.role },
        process.env.JWT_ACCESS_SECRET!,
        { expiresIn: '1h' },
      )
    : undefined;
  adminToken
    ? pass('admin login', 'minted jwt')
    : fail('admin login', 'active admin not found');
  if (!adminToken || !adminRow) throw new Error('no admin');

  const get = await req('GET', '/api/v1/admin/scratch', { token: adminToken });
  get.status < 300 && get.json?.outcomeOdds
    ? pass('admin get scratch bundle')
    : fail('admin get scratch bundle');

  const badOdds = await req('PUT', '/api/v1/admin/scratch', {
    token: adminToken,
    body: {
      outcomeOdds: { coinsPercent: 60, redeemPercent: 50, coinAmount: 10 },
      policy: { retentionDays: 30, autoPurge: true, showExpired: false },
      prizes: [],
    },
  });
  badOdds.status === 400
    ? pass('admin rejects odds not totaling 100')
    : fail('admin rejects odds not totaling 100', `HTTP ${badOdds.status}`);

  const saved = await req('PUT', '/api/v1/admin/scratch', {
    token: adminToken,
    body: {
      outcomeOdds: { coinsPercent: 100, redeemPercent: 0, coinAmount: 40 },
      policy: { retentionDays: 21, autoPurge: true, showExpired: false },
      prizes: [
        {
          id: 'e2e_gift',
          title: 'E2E Gift',
          detail: 'Test gift',
          kind: 'GIFT',
          rewardLabel: '+40 coins',
          coinReward: 40,
          oddsPercent: 100,
          enabled: true,
          streakDays: null,
        },
      ],
    },
  });
  saved.status < 300 && saved.json?.policy?.retentionDays === 21
    ? pass('admin save scratch')
    : fail('admin save scratch', JSON.stringify(saved.json)?.slice(0, 180));

  {
    const pagePath = path.join(
      __dirname,
      '..',
      '..',
      'admin',
      'src',
      'components',
      'scratch',
      'scratch-data.ts',
    );
    const pageSrc = fs.readFileSync(pagePath, 'utf8');
    !pageSrc.includes('SCRATCH_DEMO_ROWS')
      ? pass('admin scratch has no demo rows')
      : fail('admin scratch has no demo rows');
  }

  const persistId = `e2e_prize_${Date.now()}`;
  const prizeBody = {
    id: persistId,
    title: 'E2E Persist Gift',
    detail: 'Stays after reload',
    kind: 'GIFT',
    rewardLabel: '+7 coins',
    coinReward: 7,
    oddsPercent: 10,
    enabled: true,
    streakDays: null,
  };
  {
    const r = await req('POST', '/api/v1/admin/scratch/prizes');
    r.status === 401
      ? pass('prize create requires admin auth')
      : fail('prize create requires admin auth', `HTTP ${r.status}`);
  }
  {
    const r = await req('POST', '/api/v1/admin/scratch/prizes', {
      token: userToken,
      body: prizeBody,
    });
    r.status === 401
      ? pass('user JWT blocked on prize create')
      : fail('user JWT blocked on prize create', `HTTP ${r.status}`);
  }
  const createdPrize = await req('POST', '/api/v1/admin/scratch/prizes', {
    token: adminToken,
    body: prizeBody,
  });
  createdPrize.status < 300 && createdPrize.json?.id === persistId
    ? pass('admin create prize row')
    : fail(
        'admin create prize row',
        `HTTP ${createdPrize.status} ${JSON.stringify(createdPrize.json)?.slice(0, 180)}`,
      );

  const afterCreate = await req('GET', '/api/v1/admin/scratch', {
    token: adminToken,
  });
  Array.isArray(afterCreate.json?.prizes) &&
  afterCreate.json.prizes.some((p: { id?: string }) => p.id === persistId)
    ? pass('created prize present on GET')
    : fail(
        'created prize present on GET',
        JSON.stringify(afterCreate.json?.prizes)?.slice(0, 180),
      );

  const updatedPrize = await req(
    'PUT',
    `/api/v1/admin/scratch/prizes/${persistId}`,
    {
      token: adminToken,
      body: { ...prizeBody, title: 'E2E Persist Gift Edited', enabled: false },
    },
  );
  const afterUpdate = await req('GET', '/api/v1/admin/scratch', {
    token: adminToken,
  });
  const updatedRow = afterUpdate.json?.prizes?.find(
    (p: { id?: string }) => p.id === persistId,
  );
  updatedPrize.status < 300 &&
  updatedRow?.title === 'E2E Persist Gift Edited' &&
  updatedRow?.enabled === false
    ? pass('admin update+toggle prize persists')
    : fail(
        'admin update+toggle prize persists',
        `HTTP ${updatedPrize.status} ${JSON.stringify(updatedRow)?.slice(0, 180)}`,
      );

  const dup = await req('POST', '/api/v1/admin/scratch/prizes', {
    token: adminToken,
    body: prizeBody,
  });
  dup.status === 409 && dup.json?.error?.code === 'SCRATCH_DUP_PRIZE'
    ? pass('duplicate prize id rejected')
    : fail(
        'duplicate prize id rejected',
        `HTTP ${dup.status} ${JSON.stringify(dup.json)?.slice(0, 160)}`,
      );

  const oddsOnly = await req('PUT', '/api/v1/admin/scratch', {
    token: adminToken,
    body: {
      outcomeOdds: { coinsPercent: 100, redeemPercent: 0, coinAmount: 40 },
      policy: { retentionDays: 21, autoPurge: true, showExpired: false },
    },
  });
  const afterOdds = await req('GET', '/api/v1/admin/scratch', {
    token: adminToken,
  });
  oddsOnly.status < 300 &&
  afterOdds.json?.prizes?.some((p: { id?: string }) => p.id === persistId) &&
  afterOdds.json?.prizes?.some((p: { id?: string }) => p.id === 'e2e_gift')
    ? pass('odds-only save keeps prize table')
    : fail(
        'odds-only save keeps prize table',
        `HTTP ${oddsOnly.status} ${JSON.stringify(afterOdds.json?.prizes)?.slice(0, 180)}`,
      );

  const deletedPrize = await req(
    'DELETE',
    `/api/v1/admin/scratch/prizes/${persistId}`,
    { token: adminToken },
  );
  const afterDelete = await req('GET', '/api/v1/admin/scratch', {
    token: adminToken,
  });
  deletedPrize.status < 300 &&
  !afterDelete.json?.prizes?.some((p: { id?: string }) => p.id === persistId)
    ? pass('admin delete prize row')
    : fail('admin delete prize row', `HTTP ${deletedPrize.status}`);

  const cfg = await req('GET', '/api/v1/scratch/config', { token: userToken });
  cfg.status < 300 &&
  cfg.json?.eligibility?.canRoll === true &&
  cfg.json?.policy?.retentionDays === 21
    ? pass('user config eligible', `rollsLeft=${cfg.json.eligibility.rollsLeft}`)
    : fail('user config eligible', JSON.stringify(cfg.json)?.slice(0, 200));

  // No check-in user blocked
  const noCheck = await prisma.user.upsert({
    where: { email: 'e2e.scratch.nocheck@example.com' },
    update: { isActive: true, lastCheckinDay: null },
    create: {
      googleSub: 'e2e-scratch-nocheck',
      email: 'e2e.scratch.nocheck@example.com',
      displayName: 'No Check',
      isActive: true,
      lastCheckinDay: null,
    },
  });
  const noCheckTok = jwt.sign(
    { sub: noCheck.id, email: noCheck.email, aud: 'user' },
    userSecret,
    { expiresIn: '1h' },
  );
  {
    const r = await req('POST', '/api/v1/scratch/roll', { token: noCheckTok });
    r.status === 409 && r.json?.error?.code === 'SCRATCH_CHECKIN_REQUIRED'
      ? pass('roll requires check-in')
      : fail('roll requires check-in', JSON.stringify(r.json));
  }

  const roll = await req('POST', '/api/v1/scratch/roll', { token: userToken });
  roll.status < 300 &&
  roll.json?.outcome === 'COINS' &&
  typeof roll.json?.coinDelta === 'number'
    ? pass('server roll coins', `delta=${roll.json.coinDelta}`)
    : fail('server roll coins', JSON.stringify(roll.json));

  const again = await req('POST', '/api/v1/scratch/roll', { token: userToken });
  again.status === 409 && again.json?.error?.code === 'SCRATCH_LIMIT'
    ? pass('daily roll limit enforced')
    : fail('daily roll limit enforced', JSON.stringify(again.json));

  // Parallel double-tap must not create a second roll row
  {
    await prisma.scratchRoll.deleteMany({ where: { userId: user.id, dayKey: day } });
    await prisma.walletLedger.deleteMany({
      where: {
        userId: user.id,
        idempotencyKey: { startsWith: `earn:scratch:${user.id}:${day}` },
      },
    });
    const [a, b] = await Promise.all([
      req('POST', '/api/v1/scratch/roll', { token: userToken }),
      req('POST', '/api/v1/scratch/roll', { token: userToken }),
    ]);
    const okCount = [a, b].filter((r) => r.status < 300).length;
    const limitCount = [a, b].filter(
      (r) => r.status === 409 && r.json?.error?.code === 'SCRATCH_LIMIT',
    ).length;
    const rows = await prisma.scratchRoll.count({
      where: { userId: user.id, dayKey: day },
    });
    okCount === 1 && limitCount === 1 && rows === 1
      ? pass('parallel double-roll race safe', `ok=${okCount} limit=${limitCount} rows=${rows}`)
      : fail(
          'parallel double-roll race safe',
          `ok=${okCount} limit=${limitCount} rows=${rows} a=${a.status} b=${b.status}`,
        );
  }

  const noScratch = await prisma.admin.upsert({
    where: { email: 'e2e.noscratch@example.com' },
    update: {
      isActive: true,
      allowedModules: ['community'],
      role: 'ADMIN',
      mustChangePassword: false,
    },
    create: {
      email: 'e2e.noscratch@example.com',
      passwordHash: '$2b$10$invalidhashfortestsonlyxxxxxx',
      role: 'ADMIN',
      isActive: true,
      allowedModules: ['community'],
      mustChangePassword: false,
    },
  });
  const noScratchTok = jwt.sign(
    { sub: noScratch.id, email: noScratch.email, role: 'ADMIN' },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: '1h' },
  );
  {
    const r = await req('GET', '/api/v1/admin/scratch', { token: noScratchTok });
    r.status === 403
      ? pass('scratch module guard 403')
      : fail('scratch module guard 403', `HTTP ${r.status}`);
  }

  // Restore odds/policy + original prize table (wipes e2e_gift if snapshot was empty)
  await req('PUT', '/api/v1/admin/scratch', {
    token: adminToken,
    body: {
      outcomeOdds: { coinsPercent: 55, redeemPercent: 45, coinAmount: 50 },
      policy: get.json?.policy ?? {
        retentionDays: 30,
        autoPurge: true,
        showExpired: false,
      },
      prizes: Array.isArray(get.json?.prizes) ? get.json.prizes : [],
    },
  });

  const failed = checks.filter((c) => !c.ok);
  console.log('\n--- Summary ---');
  console.log(
    `Total: ${checks.length}  Pass: ${checks.length - failed.length}  Fail: ${failed.length}`,
  );
  if (failed.length) {
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail ?? ''}`);
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
