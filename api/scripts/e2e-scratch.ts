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
  const adminPassword = process.env.SUPERADMIN_PASSWORD ?? '123456';
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

  const login = await req('POST', '/api/v1/auth/login', {
    body: { email: adminEmail, password: adminPassword },
  });
  const adminToken = login.json?.accessToken as string | undefined;
  adminToken ? pass('admin login') : fail('admin login');
  if (!adminToken) throw new Error('no admin');

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

  // Restore usable defaults
  await req('PUT', '/api/v1/admin/scratch', {
    token: adminToken,
    body: {
      outcomeOdds: { coinsPercent: 55, redeemPercent: 45, coinAmount: 50 },
      policy: get.json?.policy ?? {
        retentionDays: 30,
        autoPurge: true,
        showExpired: false,
      },
      prizes: get.json?.prizes?.length
        ? get.json.prizes
        : saved.json?.prizes ?? [],
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
