/**
 * Redeem winners ticker e2e (local Postgres + Nest :4000).
 * Run: npx ts-node --transpile-only scripts/e2e-redeem-winners.ts
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
    const m = line.match(/^([A-Z0_9_]+)=(.*)$/);
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
  const stamp = Date.now();
  const secretDaily = `WIN-E2E-D-${stamp}-XX`;
  const secretWeekly = `WIN-E2E-W-${stamp}-XX`;

  const realUser = await prisma.user.upsert({
    where: { email: `winners.real.${stamp}@example.com` },
    update: { isActive: true, displayName: 'Ticker Hero', coins: 50_000 },
    create: {
      googleSub: `winners-real-${stamp}`,
      email: `winners.real.${stamp}@example.com`,
      displayName: 'Ticker Hero',
      isActive: true,
      coins: 50_000,
    },
  });

  const fakeUser = await prisma.user.upsert({
    where: { email: `e2e.winners.${stamp}@example.com` },
    update: { isActive: true, displayName: 'E2E Fake Win', coins: 50_000 },
    create: {
      googleSub: `e2e-winners-${stamp}`,
      email: `e2e.winners.${stamp}@example.com`,
      displayName: 'E2E Fake Win',
      isActive: true,
      coins: 50_000,
    },
  });

  const daily = await prisma.redeemCode.create({
    data: {
      title: `E2E Winners Daily ${stamp}`,
      type: 'GOOGLE_PLAY',
      valueLabel: '100 Diamonds',
      codeSecret: secretDaily,
      status: 'ACTIVE',
      cadence: 'DAILY',
      stockLeft: 1,
      coinCost: 0,
      expiresLabel: 'E2E',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      redeemUrl: 'https://play.google.com/redeem',
    },
  });

  const weekly = await prisma.redeemCode.create({
    data: {
      title: `E2E Winners Weekly ${stamp}`,
      type: 'GOOGLE_PLAY',
      valueLabel: 'Weekly Pack',
      codeSecret: secretWeekly,
      status: 'ACTIVE',
      cadence: 'WEEKLY',
      stockLeft: 1,
      coinCost: 0,
      expiresLabel: 'E2E',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      redeemUrl: 'https://play.google.com/redeem',
    },
  });

  const realToken = jwt.sign(
    { sub: realUser.id, email: realUser.email, aud: 'user' },
    userSecret,
    { expiresIn: '2h' },
  );
  const fakeToken = jwt.sign(
    { sub: fakeUser.id, email: fakeUser.email, aud: 'user' },
    userSecret,
    { expiresIn: '2h' },
  );

  try {
    const noAuth = await req('GET', '/api/v1/redeem/winners?cadence=DAILY');
    noAuth.status === 401
      ? pass('winners requires auth', `status=${noAuth.status}`)
      : fail('winners requires auth', `status=${noAuth.status}`);

    const claimDaily = await req('POST', `/api/v1/redeem/${daily.id}/claim`, {
      token: realToken,
    });
    claimDaily.status === 200 || claimDaily.status === 201
      ? pass('real user claimed daily', `status=${claimDaily.status}`)
      : fail(
          'real user claimed daily',
          `status=${claimDaily.status} body=${JSON.stringify(claimDaily.json)}`,
        );

    const claimWeekly = await req('POST', `/api/v1/redeem/${weekly.id}/claim`, {
      token: realToken,
    });
    claimWeekly.status === 200 || claimWeekly.status === 201
      ? pass('real user claimed weekly', `status=${claimWeekly.status}`)
      : fail(
          'real user claimed weekly',
          `status=${claimWeekly.status} body=${JSON.stringify(claimWeekly.json)}`,
        );

    // Second claim on same codes by fake e2e user — need unique codes (stock)
    const fakeDaily = await prisma.redeemCode.create({
      data: {
        title: `E2E Winners Fake Daily ${stamp}`,
        type: 'GOOGLE_PLAY',
        valueLabel: 'Fake Prize',
        codeSecret: `WIN-E2E-FD-${stamp}-XX`,
        status: 'ACTIVE',
        cadence: 'DAILY',
        stockLeft: 1,
        coinCost: 0,
        expiresLabel: 'E2E',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        redeemUrl: 'https://play.google.com/redeem',
      },
    });
    const fakeClaim = await req('POST', `/api/v1/redeem/${fakeDaily.id}/claim`, {
      token: fakeToken,
    });
    fakeClaim.status === 200 || fakeClaim.status === 201
      ? pass('e2e fake claimed daily', `status=${fakeClaim.status}`)
      : fail(
          'e2e fake claimed daily',
          `status=${fakeClaim.status} body=${JSON.stringify(fakeClaim.json)}`,
        );

    const dailyWin = await req('GET', '/api/v1/redeem/winners?cadence=DAILY', {
      token: realToken,
    });
    if (dailyWin.status !== 200) {
      fail('GET winners DAILY', `status=${dailyWin.status}`);
    } else {
      const items = dailyWin.json?.items ?? [];
      const texts: string[] = items.map((i: any) => String(i.text ?? ''));
      const blob = JSON.stringify(dailyWin.json);
      const hasReal = texts.some(
        (t) => t.includes('Ticker Hero') && t.includes('100 Diamonds'),
      );
      const hasFake = texts.some((t) => t.includes('E2E Fake Win'));
      const hasWeeklyPrize = texts.some((t) => t.includes('Weekly Pack'));
      const leaksSecret =
        blob.includes(secretDaily) ||
        blob.includes(secretWeekly) ||
        blob.includes('codeSecret') ||
        /WIN-E2E-/.test(blob);

      hasReal
        ? pass('daily shows real winner line', texts.find((t) => t.includes('Ticker Hero')))
        : fail('daily shows real winner line', texts.slice(0, 5).join(' | '));
      !hasFake
        ? pass('daily hides e2e fake user')
        : fail('daily hides e2e fake user', 'E2E Fake Win visible');
      !hasWeeklyPrize
        ? pass('daily excludes weekly prize')
        : fail('daily excludes weekly prize', 'Weekly Pack in DAILY');
      !leaksSecret
        ? pass('daily response has no code secrets')
        : fail('daily response has no code secrets', blob.slice(0, 300));

      const shapeOk = items.every(
        (i: any) =>
          typeof i.id === 'string' &&
          typeof i.text === 'string' &&
          typeof i.displayName === 'string' &&
          typeof i.prizeLabel === 'string' &&
          typeof i.cadence === 'string' &&
          typeof i.createdAt === 'string',
      );
      shapeOk
        ? pass('winner item shape ok')
        : fail('winner item shape ok', JSON.stringify(items[0]));
    }

    const weeklyWin = await req(
      'GET',
      '/api/v1/redeem/winners?cadence=WEEKLY',
      { token: realToken },
    );
    if (weeklyWin.status !== 200) {
      fail('GET winners WEEKLY', `status=${weeklyWin.status}`);
    } else {
      const texts: string[] = (weeklyWin.json?.items ?? []).map((i: any) =>
        String(i.text ?? ''),
      );
      const hasWeekly = texts.some(
        (t) => t.includes('Ticker Hero') && t.includes('Weekly Pack'),
      );
      const hasDailyPrize = texts.some((t) => t.includes('100 Diamonds'));
      hasWeekly
        ? pass('weekly shows weekly winner', texts.find((t) => t.includes('Weekly Pack')))
        : fail('weekly shows weekly winner', texts.slice(0, 5).join(' | '));
      !hasDailyPrize
        ? pass('weekly excludes daily prize')
        : fail('weekly excludes daily prize', '100 Diamonds in WEEKLY');
    }

    await prisma.redeemCodeSecret.deleteMany({
      where: { redeemCodeId: { in: [daily.id, weekly.id, fakeDaily.id] } },
    });
    await prisma.redeemClaim.deleteMany({
      where: { redeemCodeId: { in: [daily.id, weekly.id, fakeDaily.id] } },
    });
    await prisma.redeemCode.deleteMany({
      where: { id: { in: [daily.id, weekly.id, fakeDaily.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [realUser.id, fakeUser.id] } },
    });
    pass('cleanup winners e2e rows');
  } finally {
    await prisma.$disconnect();
  }

  const failed = checks.filter((c) => !c.ok);
  console.log(
    `\n${checks.length - failed.length}/${checks.length} passed` +
      (failed.length ? ` — FAIL: ${failed.map((f) => f.name).join(', ')}` : ''),
  );
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
