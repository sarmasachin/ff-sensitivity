/**
 * Challenge admin + user quiz e2e / security (local Postgres).
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

  const user = await prisma.user.upsert({
    where: { email: 'e2e.challenge@example.com' },
    update: { isActive: true, coins: 100 },
    create: {
      googleSub: 'e2e-challenge-sub',
      email: 'e2e.challenge@example.com',
      displayName: 'E2E Challenge',
      isActive: true,
      coins: 100,
    },
  });

  // Clear quiz ledger for today so submit is fresh
  const day = new Date().toISOString().slice(0, 10);
  await prisma.walletLedger.deleteMany({
    where: {
      userId: user.id,
      OR: [
        { idempotencyKey: { startsWith: `earn:quiz:ok:${user.id}:${day}` } },
        { idempotencyKey: { startsWith: `earn:quiz:wrong:${user.id}:${day}` } },
      ],
    },
  });

  const userToken = jwt.sign(
    { sub: user.id, email: user.email, aud: 'user' },
    userSecret,
    { expiresIn: '1h' },
  );

  {
    const r = await req('GET', '/api/v1/admin/challenge');
    r.status === 401
      ? pass('admin challenge requires auth', `HTTP ${r.status}`)
      : fail('admin challenge requires auth', `HTTP ${r.status}`);
  }
  {
    const r = await req('GET', '/api/v1/admin/challenge', { token: userToken });
    r.status === 401
      ? pass('user JWT blocked on admin challenge', `HTTP ${r.status}`)
      : fail('user JWT blocked on admin challenge', `HTTP ${r.status}`);
  }
  {
    const r = await req('GET', '/api/v1/challenge/today');
    r.status === 401
      ? pass('user today requires auth', `HTTP ${r.status}`)
      : fail('user today requires auth', `HTTP ${r.status}`);
  }

  // Old forge path must be closed
  {
    const r = await req('POST', '/api/v1/economy/challenge/earn', {
      token: userToken,
      body: { kind: 'QUIZ', correct: true },
    });
    r.status === 400 && r.json?.error?.code === 'ECONOMY_QUIZ_MOVED'
      ? pass('client-attested QUIZ earn blocked')
      : fail(
          'client-attested QUIZ earn blocked',
          `HTTP ${r.status} ${JSON.stringify(r.json)}`,
        );
  }

  const login = await req('POST', '/api/v1/auth/login', {
    body: { email: adminEmail, password: adminPassword },
  });
  const adminToken = login.json?.accessToken as string | undefined;
  adminToken ? pass('admin login') : fail('admin login', `HTTP ${login.status}`);
  if (!adminToken) throw new Error('no admin token');

  const get = await req('GET', '/api/v1/admin/challenge', { token: adminToken });
  get.status < 300 && get.json?.rules && Array.isArray(get.json?.quiz)
    ? pass('admin get challenge bundle', `quiz=${get.json.quiz.length}`)
    : fail('admin get challenge bundle', JSON.stringify(get.json)?.slice(0, 200));

  const saveBody = {
    rules: {
      ...(get.json?.rules ?? {}),
      quizCorrectCoins: 50,
      quizWrongCoins: -10,
      wrongAnswerLockHours: 4,
      quizOpenWindowHours: 2,
      missDayResetsStreak: true,
      requireCheckIn: true,
      requireQuiz: true,
      adBonusOptional: true,
      scratchCardsPerDay: 1,
      cardExpiresSameDay: true,
      firstMilestoneDays: 7,
    },
    quiz: [
      {
        id: 'e2e_q1',
        question: 'E2E what is 2+2?',
        options: ['3', '4', '5', '6'],
        correctIndex: 1,
        enabled: true,
      },
    ],
    milestones: [
      {
        id: 'e2e_m7',
        days: 7,
        title: 'E2E Week',
        rewardLabel: '+50',
        coinReward: 50,
        badge: null,
        enabled: true,
      },
    ],
  };
  const saved = await req('PUT', '/api/v1/admin/challenge', {
    token: adminToken,
    body: saveBody,
  });
  saved.status < 300 && saved.json?.quiz?.[0]?.id === 'e2e_q1'
    ? pass('admin save challenge')
    : fail('admin save challenge', JSON.stringify(saved.json)?.slice(0, 200));

  // Admin response includes correctIndex; user today must NOT
  const today = await req('GET', '/api/v1/challenge/today', { token: userToken });
  const q = today.json?.question;
  today.status < 300 &&
  q?.id === 'e2e_q1' &&
  q.correctIndex === undefined &&
  !JSON.stringify(q).includes('correctIndex')
    ? pass('user today hides correctIndex')
    : fail(
        'user today hides correctIndex',
        JSON.stringify(q)?.slice(0, 200),
      );

  // Correct answer first (no prior wrong → not locked)
  const ok = await req('POST', '/api/v1/challenge/quiz/submit', {
    token: userToken,
    body: { questionId: 'e2e_q1', selectedIndex: 1 },
  });
  ok.status < 300 && ok.json?.correct === true
    ? pass('quiz correct graded server-side', `delta=${ok.json?.delta}`)
    : fail('quiz correct graded server-side', JSON.stringify(ok.json));

  // After correct: further submits blocked (no extra wrong penalty)
  {
    const r = await req('POST', '/api/v1/challenge/quiz/submit', {
      token: userToken,
      body: { questionId: 'e2e_q1', selectedIndex: 0 },
    });
    r.status === 409 && r.json?.error?.code === 'CHALLENGE_ALREADY_DONE'
      ? pass('after correct, re-submit blocked')
      : fail(
          'after correct, re-submit blocked',
          `HTTP ${r.status} ${JSON.stringify(r.json)}`,
        );
  }

  const other = await prisma.user.upsert({
    where: { email: 'e2e.challenge.other@example.com' },
    update: { isActive: true, coins: 50 },
    create: {
      googleSub: 'e2e-challenge-other',
      email: 'e2e.challenge.other@example.com',
      displayName: 'E2E Challenge Other',
      isActive: true,
      coins: 50,
    },
  });
  await prisma.walletLedger.deleteMany({
    where: {
      userId: other.id,
      OR: [
        { idempotencyKey: { startsWith: `earn:quiz:ok:${other.id}:${day}` } },
        { idempotencyKey: { startsWith: `earn:quiz:wrong:${other.id}:${day}` } },
      ],
    },
  });
  const otherToken = jwt.sign(
    { sub: other.id, email: other.email, aud: 'user' },
    userSecret,
    { expiresIn: '1h' },
  );
  {
    const r = await req('POST', '/api/v1/challenge/quiz/submit', {
      token: otherToken,
      body: { questionId: 'not_today', selectedIndex: 1 },
    });
    r.status >= 400 && r.json?.error?.code === 'CHALLENGE_WRONG_QUESTION'
      ? pass('reject non-today question id', `HTTP ${r.status}`)
      : fail(
          'reject non-today question id',
          `HTTP ${r.status} ${JSON.stringify(r.json)}`,
        );
  }

  // Wrong + lock (separate user)
  {
    await prisma.walletLedger.deleteMany({
      where: {
        userId: other.id,
        OR: [
          { idempotencyKey: { startsWith: `earn:quiz:ok:${other.id}:${day}` } },
          {
            idempotencyKey: { startsWith: `earn:quiz:wrong:${other.id}:${day}` },
          },
        ],
      },
    });
    const w1 = await req('POST', '/api/v1/challenge/quiz/submit', {
      token: otherToken,
      body: { questionId: 'e2e_q1', selectedIndex: 0 },
    });
    w1.status < 300 && w1.json?.correct === false
      ? pass('quiz wrong graded server-side', `delta=${w1.json?.delta}`)
      : fail('quiz wrong graded server-side', JSON.stringify(w1.json));
    const w2 = await req('POST', '/api/v1/challenge/quiz/submit', {
      token: otherToken,
      body: { questionId: 'e2e_q1', selectedIndex: 0 },
    });
    w2.status === 409 && w2.json?.error?.code === 'CHALLENGE_QUIZ_LOCKED'
      ? pass('server enforces wrong-answer lock')
      : fail(
          'server enforces wrong-answer lock',
          `w2=${w2.status} ${w2.json?.error?.code}`,
        );
  }

  // Module guard
  const noCh = await prisma.admin.upsert({
    where: { email: 'e2e.nochallenge@example.com' },
    update: {
      isActive: true,
      allowedModules: ['community'],
      role: 'ADMIN',
      mustChangePassword: false,
    },
    create: {
      email: 'e2e.nochallenge@example.com',
      passwordHash: '$2b$10$invalidhashfortestsonlyxxxxxx',
      role: 'ADMIN',
      isActive: true,
      allowedModules: ['community'],
      mustChangePassword: false,
    },
  });
  const noChToken = jwt.sign(
    { sub: noCh.id, email: noCh.email, role: 'ADMIN' },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: '1h' },
  );
  {
    const r = await req('GET', '/api/v1/admin/challenge', { token: noChToken });
    r.status === 403
      ? pass('challenge module guard 403', `HTTP ${r.status}`)
      : fail('challenge module guard 403', `HTTP ${r.status}`);
  }

  // Restore a fuller bank so app is usable after e2e
  await req('PUT', '/api/v1/admin/challenge', {
    token: adminToken,
    body: {
      rules: saveBody.rules,
      quiz: get.json?.quiz?.length
        ? get.json.quiz
        : [
            {
              id: 'q1',
              question: 'Approx Free Fire nickname character limit is?',
              options: ['6', '12', '20', '30'],
              correctIndex: 1,
              enabled: true,
            },
          ],
      milestones: get.json?.milestones?.length
        ? get.json.milestones
        : saveBody.milestones,
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
