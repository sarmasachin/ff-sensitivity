/**
 * Compare sensitivity entries live on the server and are visible to every user.
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

function tokenFor(user: { id: string; email: string; tokenVersion: number }) {
  return jwt.sign(
    { sub: user.id, email: user.email, aud: 'user', tv: user.tokenVersion },
    process.env.JWT_USER_SECRET!,
    { expiresIn: '1h' },
  );
}

function body(over: Record<string, unknown> = {}) {
  return {
    deviceLabel: 'E2E Phone',
    fingers: 'E2E Fingers',
    role: 'E2E Role',
    dpiPreference: 'Mid DPI',
    screenGuard: 'Normal HD',
    feedback: 'perfect',
    suggested: {
      general: 100,
      redDot: 80,
      scope2x: 70,
      scope4x: 60,
      sniper: 50,
      freeLook: 40,
      fireButton: 20,
    },
    actual: {
      general: 120,
      redDot: 80,
      scope2x: 70,
      scope4x: 60,
      sniper: 50,
      freeLook: 40,
      fireButton: 20,
    },
    ...over,
  };
}

async function main() {
  loadEnv();
  const stamp = Date.now();
  const userA = await prisma.user.create({
    data: {
      googleSub: `e2e-compare-a-${stamp}`,
      email: `e2e.compare.a.${stamp}@example.com`,
      displayName: 'Compare A',
      isActive: true,
    },
  });
  const userB = await prisma.user.create({
    data: {
      googleSub: `e2e-compare-b-${stamp}`,
      email: `e2e.compare.b.${stamp}@example.com`,
      displayName: 'Compare B',
      isActive: true,
    },
  });
  const tokenA = tokenFor(userA);
  const tokenB = tokenFor(userB);
  const listPath = '/api/v1/compare?fingers=E2E%20Fingers&role=E2E%20Role';

  try {
    const anon = await req('GET', '/api/v1/compare');
    anon.status === 401
      ? pass('list requires auth')
      : fail('list requires auth', `HTTP ${anon.status}`);

    const anonSave = await req('POST', '/api/v1/compare', { body: body() });
    anonSave.status === 401
      ? pass('save requires auth')
      : fail('save requires auth', `HTTP ${anonSave.status}`);

    const bad = await req('POST', '/api/v1/compare', {
      token: tokenA,
      body: body({ feedback: 'nope' }),
    });
    bad.status === 400
      ? pass('bad feedback is rejected')
      : fail('bad feedback is rejected', `HTTP ${bad.status}`);

    const badFire = await req('POST', '/api/v1/compare', {
      token: tokenA,
      body: body({
        actual: { ...(body().actual as object), fireButton: 0 },
      }),
    });
    badFire.status === 400
      ? pass('fire button outside 1-100 is rejected')
      : fail('fire button outside 1-100 is rejected', `HTTP ${badFire.status}`);

    const saved = await req('POST', '/api/v1/compare', { token: tokenA, body: body() });
    const savedB = await req('POST', '/api/v1/compare', {
      token: tokenB,
      body: body({
        actual: { ...(body().actual as object), general: 100 },
        feedback: 'too_slow',
      }),
    });
    const sniper = await req('POST', '/api/v1/compare', {
      token: tokenB,
      body: body({
        role: 'E2E Sniper',
        actual: { ...(body().actual as object), general: 50 },
      }),
    });
    const mine = await req('GET', listPath, { token: tokenA });
    const theirs = await req('GET', listPath, { token: tokenB });
    const itemsA: any[] = mine.json?.items ?? [];
    const itemsB: any[] = theirs.json?.items ?? [];
    const aRow = itemsA.find((row) => row.id === saved.json?.id);
    const bSeesA = itemsB.some((row) => row.id === saved.json?.id);
    const bSeesSniper = itemsB.some((row) => row.id === sniper.json?.id);
    (saved.status === 200 || saved.status === 201) &&
    (savedB.status === 200 || savedB.status === 201) &&
    (sniper.status === 200 || sniper.status === 201) &&
    mine.status === 200 &&
    aRow?.displayName === 'Compare A' &&
    aRow?.actual?.general === 120 &&
    bSeesA &&
    bSeesSniper &&
    mine.json?.averageGeneralOffset === 10 &&
    theirs.json?.averageGeneralOffset === 10 &&
    mine.json?.offsetFrom === 'match' &&
    !JSON.stringify(mine.json).includes(userA.email)
      ? pass('both users see the same saves and the shared offset', String(mine.json?.averageGeneralOffset))
      : fail(
          'both users see the same saves and the shared offset',
          `a=${saved.status} b=${savedB.status} sniper=${sniper.status} avgA=${mine.json?.averageGeneralOffset} avgB=${theirs.json?.averageGeneralOffset} seesA=${bSeesA} seesSniper=${bSeesSniper}`,
        );

    await prisma.user.delete({ where: { id: userA.id } });
    const afterDelete = await req('GET', '/api/v1/compare', { token: tokenB });
    const still = (afterDelete.json?.items ?? []).some((row: any) => row.id === saved.json?.id);
    !still
      ? pass('deleting the user removes their comparison')
      : fail('deleting the user removes their comparison');

    const capped = await prisma.user.create({
      data: {
        googleSub: `e2e-compare-cap-${stamp}`,
        email: `e2e.compare.cap.${stamp}@example.com`,
        displayName: 'Compare Cap',
        isActive: true,
      },
    });
    const values = body();
    await prisma.sensitivityCompare.createMany({
      data: Array.from({ length: 30 }, () => ({
        userId: capped.id,
        deviceLabel: values.deviceLabel as string,
        fingers: values.fingers as string,
        role: values.role as string,
        dpiPreference: values.dpiPreference as string,
        screenGuard: values.screenGuard as string,
        feedback: 'perfect',
        suggestedGeneral: 100,
        suggestedRedDot: 80,
        suggestedScope2x: 70,
        suggestedScope4x: 60,
        suggestedSniper: 50,
        suggestedFreeLook: 40,
        suggestedFireButton: 20,
        actualGeneral: 100,
        actualRedDot: 80,
        actualScope2x: 70,
        actualScope4x: 60,
        actualSniper: 50,
        actualFreeLook: 40,
        actualFireButton: 20,
      })),
    });
    const over = await req('POST', '/api/v1/compare', {
      token: tokenFor(capped),
      body: body(),
    });
    over.status === 429 && over.json?.error?.code === 'COMPARE_DAILY_LIMIT'
      ? pass('daily save cap is enforced')
      : fail('daily save cap is enforced', `HTTP ${over.status} ${JSON.stringify(over.json)?.slice(0, 180)}`);
    await prisma.user.delete({ where: { id: capped.id } });

    const yday = await prisma.user.create({
      data: {
        googleSub: `e2e-compare-yday-${stamp}`,
        email: `e2e.compare.yday.${stamp}@example.com`,
        displayName: '   ',
        isActive: true,
      },
    });
    const yValues = body();
    await prisma.sensitivityCompare.createMany({
      data: Array.from({ length: 29 }, () => ({
        userId: yday.id,
        deviceLabel: yValues.deviceLabel as string,
        fingers: 'E2E Yday',
        role: 'E2E Yday',
        dpiPreference: yValues.dpiPreference as string,
        screenGuard: yValues.screenGuard as string,
        feedback: 'perfect',
        suggestedGeneral: 100,
        suggestedRedDot: 80,
        suggestedScope2x: 70,
        suggestedScope4x: 60,
        suggestedSniper: 50,
        suggestedFreeLook: 40,
        suggestedFireButton: 20,
        actualGeneral: 100,
        actualRedDot: 80,
        actualScope2x: 70,
        actualScope4x: 60,
        actualSniper: 50,
        actualFreeLook: 40,
        actualFireButton: 20,
      })),
    });
    await prisma.sensitivityCompare.create({
      data: {
        userId: yday.id,
        deviceLabel: 'old',
        fingers: 'E2E Yday',
        role: 'E2E Yday',
        dpiPreference: 'Mid DPI',
        screenGuard: 'Normal HD',
        feedback: 'perfect',
        suggestedGeneral: 100,
        suggestedRedDot: 1,
        suggestedScope2x: 1,
        suggestedScope4x: 1,
        suggestedSniper: 1,
        suggestedFreeLook: 1,
        suggestedFireButton: 1,
        actualGeneral: 100,
        actualRedDot: 1,
        actualScope2x: 1,
        actualScope4x: 1,
        actualSniper: 1,
        actualFreeLook: 1,
        actualFireButton: 1,
        createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000),
      },
    });
    const yToken = tokenFor(yday);
    const ySave = await req('POST', '/api/v1/compare', {
      token: yToken,
      body: body({
        deviceLabel: '  Trimmed Phone  ',
        fingers: 'E2E Yday',
        role: 'E2E Yday',
        feedback: 'too_fast',
        actual: {
          general: 90,
          redDot: 0,
          scope2x: 200,
          scope4x: 0,
          sniper: 0,
          freeLook: 0,
          fireButton: 100,
        },
      }),
    });
    const yList = await req('GET', '/api/v1/compare?fingers=E2E%20Yday&role=E2E%20Yday', {
      token: tokenB,
    });
    const yRow = (yList.json?.items ?? []).find((row: any) => row.id === ySave.json?.id);
    (ySave.status === 200 || ySave.status === 201) &&
    yRow?.displayName === 'Player' &&
    yRow?.deviceLabel === 'Trimmed Phone' &&
    yRow?.feedback === 'too_fast' &&
    yRow?.actual?.general === 90 &&
    yRow?.actual?.redDot === 0 &&
    yRow?.actual?.scope2x === 200 &&
    yRow?.actual?.fireButton === 100 &&
    yRow?.suggested?.general === 100 &&
    yRow?.dpiPreference === 'Mid DPI' &&
    yRow?.screenGuard === 'Normal HD' &&
    !('userId' in (yRow ?? {})) &&
    !Number.isNaN(Date.parse(yRow?.createdAt))
      ? pass('blank name, trimmed label, and full values are shared')
      : fail(
          'blank name, trimmed label, and full values are shared',
          `HTTP ${ySave.status} avg=${yList.json?.averageGeneralOffset} ${JSON.stringify(yRow)?.slice(0, 300)}`,
        );
    const yAgain = await req('POST', '/api/v1/compare', {
      token: yToken,
      body: body({ fingers: 'E2E Yday', role: 'E2E Yday' }),
    });
    yAgain.status === 429
      ? pass('yesterday does not count toward today cap, the 31st today does')
      : fail('yesterday does not count toward today cap, the 31st today does', `HTTP ${yAgain.status}`);

    const negA = await req('POST', '/api/v1/compare', {
      token: tokenB,
      body: body({
        fingers: 'E2E Neg',
        role: 'E2E Neg',
        actual: { ...(body().actual as object), general: 90 },
      }),
    });
    const negB = await req('POST', '/api/v1/compare', {
      token: tokenB,
      body: body({
        fingers: 'E2E Neg',
        role: 'E2E Neg',
        feedback: 'too_slow',
        actual: { ...(body().actual as object), general: 99 },
      }),
    });
    const negList = await req('GET', '/api/v1/compare?fingers=E2E+Neg&role=E2E+Neg', {
      token: tokenB,
    });
    const negItems: any[] = negList.json?.items ?? [];
    const negNewer = negItems.findIndex((row) => row.id === negB.json?.id);
    const negOlder = negItems.findIndex((row) => row.id === negA.json?.id);
    (negA.status === 200 || negA.status === 201) &&
    (negB.status === 200 || negB.status === 201) &&
    negList.json?.averageGeneralOffset === -5 &&
    negNewer >= 0 &&
    negOlder > negNewer
      ? pass('negative offset truncates toward zero and newest is first', String(negList.json?.averageGeneralOffset))
      : fail(
          'negative offset truncates toward zero and newest is first',
          `avg=${negList.json?.averageGeneralOffset} newer=${negNewer} older=${negOlder}`,
        );

    const percent = await req('GET', '/api/v1/compare?fingers=E2E%20Neg&role=E2E%20Neg', {
      token: tokenB,
    });
    percent.json?.averageGeneralOffset === -5
      ? pass('plus and percent encodings find the same rows')
      : fail('plus and percent encodings find the same rows', String(percent.json?.averageGeneralOffset));

    const blankLabel = await req('POST', '/api/v1/compare', {
      token: tokenB,
      body: body({ deviceLabel: '   ' }),
    });
    blankLabel.status === 400 && blankLabel.json?.error?.code === 'COMPARE_INVALID'
      ? pass('blank device label is rejected')
      : fail('blank device label is rejected', `HTTP ${blankLabel.status}`);

    const highScope = await req('POST', '/api/v1/compare', {
      token: tokenB,
      body: body({
        suggested: { ...(body().suggested as object), general: 201 },
      }),
    });
    highScope.status === 400
      ? pass('general above 200 is rejected')
      : fail('general above 200 is rejected', `HTTP ${highScope.status}`);

    const extra = await req('POST', '/api/v1/compare', {
      token: tokenB,
      body: body({ extra: true }),
    });
    extra.status === 400
      ? pass('unknown fields are rejected')
      : fail('unknown fields are rejected', `HTTP ${extra.status}`);

    const odd = await req('GET', '/api/v1/compare?fingers=%27%3Bdrop&role=NoSuchRole', {
      token: tokenB,
    });
    const plain = await req('GET', '/api/v1/compare', { token: tokenB });
    odd.status === 200 &&
    plain.status === 200 &&
    odd.json?.offsetFrom === 'all' &&
    plain.json?.offsetFrom === 'all' &&
    odd.json?.averageGeneralOffset === plain.json?.averageGeneralOffset
      ? pass('unknown filter falls back to the full crowd average')
      : fail(
          'unknown filter falls back to the full crowd average',
          `odd=${odd.status}/${odd.json?.averageGeneralOffset} plain=${plain.status}/${plain.json?.averageGeneralOffset}`,
        );

    const revoked = await req('GET', '/api/v1/compare', {
      token: tokenFor({ id: userB.id, email: userB.email, tokenVersion: userB.tokenVersion + 9 }),
    });
    revoked.status === 401
      ? pass('revoked token cannot read compares')
      : fail('revoked token cannot read compares', `HTTP ${revoked.status}`);

    await prisma.user.update({ where: { id: userB.id }, data: { isActive: false } });
    const suspendedList = await req('GET', '/api/v1/compare', { token: tokenB });
    const suspendedSave = await req('POST', '/api/v1/compare', { token: tokenB, body: body() });
    await prisma.user.update({ where: { id: userB.id }, data: { isActive: true } });
    suspendedList.status === 401 &&
    suspendedList.json?.error?.code === 'AUTH_INVALID' &&
    suspendedSave.status === 401
      ? pass('suspended user cannot read or save')
      : fail(
          'suspended user cannot read or save',
          `list=${suspendedList.status} save=${suspendedSave.status}`,
        );

    const fiftyUser = await prisma.user.create({
      data: {
        googleSub: `e2e-compare-fifty-${stamp}`,
        email: `e2e.compare.fifty.${stamp}@example.com`,
        displayName: 'Fifty',
        isActive: true,
      },
    });
    const oldest = await prisma.sensitivityCompare.create({
      data: {
        userId: fiftyUser.id,
        deviceLabel: 'oldest',
        fingers: 'E2E Fifty',
        role: 'E2E Fifty',
        dpiPreference: 'Mid DPI',
        screenGuard: 'Normal HD',
        feedback: 'perfect',
        suggestedGeneral: 0,
        suggestedRedDot: 0,
        suggestedScope2x: 0,
        suggestedScope4x: 0,
        suggestedSniper: 0,
        suggestedFreeLook: 0,
        suggestedFireButton: 1,
        actualGeneral: 100,
        actualRedDot: 0,
        actualScope2x: 0,
        actualScope4x: 0,
        actualSniper: 0,
        actualFreeLook: 0,
        actualFireButton: 1,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.sensitivityCompare.createMany({
      data: Array.from({ length: 50 }, (_, i) => ({
        userId: fiftyUser.id,
        deviceLabel: `row-${i}`,
        fingers: 'E2E Fifty',
        role: 'E2E Fifty',
        dpiPreference: 'Mid DPI',
        screenGuard: 'Normal HD',
        feedback: 'perfect',
        suggestedGeneral: 10,
        suggestedRedDot: 0,
        suggestedScope2x: 0,
        suggestedScope4x: 0,
        suggestedSniper: 0,
        suggestedFreeLook: 0,
        suggestedFireButton: 1,
        actualGeneral: 10,
        actualRedDot: 0,
        actualScope2x: 0,
        actualScope4x: 0,
        actualSniper: 0,
        actualFreeLook: 0,
        actualFireButton: 1,
        createdAt: new Date(Date.now() - i * 1000),
      })),
    });
    const fiftyList = await req('GET', '/api/v1/compare?fingers=E2E%20Fifty&role=E2E%20Fifty', {
      token: tokenFor(fiftyUser),
    });
    const fiftyItems: any[] = fiftyList.json?.items ?? [];
    const hidesOldest = !fiftyItems.some((row) => row.id === oldest.id);
    fiftyList.status === 200 &&
    fiftyItems.length === 50 &&
    hidesOldest &&
    fiftyList.json?.averageGeneralOffset === Math.trunc(100 / 51)
      ? pass('newest 50 are shown and the older row still counts in the average')
      : fail(
          'newest 50 are shown and the older row still counts in the average',
          `status=${fiftyList.status} n=${fiftyItems.length} hide=${hidesOldest} avg=${fiftyList.json?.averageGeneralOffset}`,
        );
    await prisma.user.delete({ where: { id: fiftyUser.id } });
    await prisma.user.delete({ where: { id: yday.id } });

    const burst = await prisma.user.create({
      data: {
        googleSub: `e2e-compare-burst-${stamp}`,
        email: `e2e.compare.burst.${stamp}@example.com`,
        displayName: 'Burst',
        isActive: true,
      },
    });
    const burstToken = tokenFor(burst);
    const burstBase = body();
    await prisma.sensitivityCompare.createMany({
      data: Array.from({ length: 29 }, () => ({
        userId: burst.id,
        deviceLabel: burstBase.deviceLabel as string,
        fingers: 'E2E Burst',
        role: 'E2E Burst',
        dpiPreference: burstBase.dpiPreference as string,
        screenGuard: burstBase.screenGuard as string,
        feedback: 'perfect',
        suggestedGeneral: 10,
        suggestedRedDot: 0,
        suggestedScope2x: 0,
        suggestedScope4x: 0,
        suggestedSniper: 0,
        suggestedFreeLook: 0,
        suggestedFireButton: 1,
        actualGeneral: 10,
        actualRedDot: 0,
        actualScope2x: 0,
        actualScope4x: 0,
        actualSniper: 0,
        actualFreeLook: 0,
        actualFireButton: 1,
      })),
    });
    const burstResults = await Promise.all(
      Array.from({ length: 2 }, () =>
        req('POST', '/api/v1/compare', {
          token: burstToken,
          body: body({ fingers: 'E2E Burst', role: 'E2E Burst' }),
        }),
      ),
    );
    const burstOk = burstResults.filter((row) => row.status === 200 || row.status === 201).length;
    const burstRows = await prisma.sensitivityCompare.count({ where: { userId: burst.id } });
    burstOk === 1 && burstRows === 30
      ? pass('parallel saves cannot pass the daily cap')
      : fail('parallel saves cannot pass the daily cap', `ok=${burstOk} rows=${burstRows}`);
    await prisma.user.delete({ where: { id: burst.id } });
  } finally {
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            userA.email,
            userB.email,
            `e2e.compare.cap.${stamp}@example.com`,
            `e2e.compare.yday.${stamp}@example.com`,
            `e2e.compare.fifty.${stamp}@example.com`,
            `e2e.compare.burst.${stamp}@example.com`,
          ],
        },
      },
    });
    await prisma.$disconnect();
  }

  const badChecks = checks.filter((c) => !c.ok);
  console.log(
    badChecks.length === 0 ? `ALL_PASS ${checks.length}` : `FAILED ${badChecks.length}/${checks.length}`,
  );
  if (badChecks.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
