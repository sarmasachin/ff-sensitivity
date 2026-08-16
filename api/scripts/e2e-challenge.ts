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
        { idempotencyKey: { startsWith: `quiz:second:${user.id}:${day}` } },
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

  // Admin API auth: mint JWT with the same claims as AuthService sessions.
  // Password login now sets httpOnly cookies and may require OTP — neither
  // fits headless e2e, so we sign locally against JWT_ACCESS_SECRET.
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
  if (!adminToken || !adminRow) throw new Error('no admin token');

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
      wrongAnswerLockMinutes: 20,
      quizOpenWindowHours: 2,
      missDayResetsStreak: true,
      requireCheckIn: true,
      requireQuiz: true,
      adBonusOptional: true,
      adBonusCooldownHours: 4,
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
      {
        id: 'e2e_q2',
        question: 'E2E what is 3+3?',
        options: ['5', '6', '7', '8'],
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

  {
    const r = await req('POST', '/api/v1/admin/challenge/quiz', {
      body: {
        id: 'e2e_noauth',
        question: 'Should be blocked',
        options: ['a', 'b', 'c', 'd'],
        correctIndex: 0,
        enabled: true,
      },
    });
    r.status === 401
      ? pass('quiz create requires admin auth', `HTTP ${r.status}`)
      : fail('quiz create requires admin auth', `HTTP ${r.status}`);
  }
  {
    const r = await req('POST', '/api/v1/admin/challenge/quiz', {
      token: userToken,
      body: {
        id: 'e2e_userjwt',
        question: 'Should be blocked',
        options: ['a', 'b', 'c', 'd'],
        correctIndex: 0,
        enabled: true,
      },
    });
    r.status === 401
      ? pass('user JWT blocked on quiz create', `HTTP ${r.status}`)
      : fail('user JWT blocked on quiz create', `HTTP ${r.status}`);
  }

  const persistId = `e2e_persist_${Date.now()}`;
  const quizBody = {
    id: persistId,
    question: 'E2E does quiz persist without full save?',
    options: ['no', 'yes', 'maybe', 'idk'],
    correctIndex: 1,
    enabled: true,
  };
  const createdQuiz = await req('POST', '/api/v1/admin/challenge/quiz', {
    token: adminToken,
    body: quizBody,
  });
  createdQuiz.status < 300 && createdQuiz.json?.id === persistId
    ? pass('admin create quiz row')
    : fail(
        'admin create quiz row',
        `HTTP ${createdQuiz.status} ${JSON.stringify(createdQuiz.json)?.slice(0, 180)}`,
      );

  const afterCreate = await req('GET', '/api/v1/admin/challenge', {
    token: adminToken,
  });
  Array.isArray(afterCreate.json?.quiz) &&
  afterCreate.json.quiz.some((q: { id?: string }) => q.id === persistId)
    ? pass('created quiz present on GET')
    : fail(
        'created quiz present on GET',
        JSON.stringify(afterCreate.json?.quiz)?.slice(0, 180),
      );

  const updatedQuiz = await req(
    'PUT',
    `/api/v1/admin/challenge/quiz/${persistId}`,
    {
      token: adminToken,
      body: {
        ...quizBody,
        question: 'E2E edited question stays after reload',
        enabled: false,
      },
    },
  );
  const afterUpdate = await req('GET', '/api/v1/admin/challenge', {
    token: adminToken,
  });
  const updatedRow = afterUpdate.json?.quiz?.find(
    (q: { id?: string }) => q.id === persistId,
  );
  updatedQuiz.status < 300 &&
  updatedRow?.question === 'E2E edited question stays after reload' &&
  updatedRow?.enabled === false
    ? pass('admin update+toggle quiz persists')
    : fail(
        'admin update+toggle quiz persists',
        `HTTP ${updatedQuiz.status} ${JSON.stringify(updatedRow)?.slice(0, 180)}`,
      );

  const dup = await req('POST', '/api/v1/admin/challenge/quiz', {
    token: adminToken,
    body: quizBody,
  });
  dup.status === 409 && dup.json?.error?.code === 'CHALLENGE_DUP_QUIZ'
    ? pass('duplicate quiz id rejected')
    : fail(
        'duplicate quiz id rejected',
        `HTTP ${dup.status} ${JSON.stringify(dup.json)?.slice(0, 160)}`,
      );

  const persistMsId = `e2e_ms_${Date.now()}`;
  const createdMs = await req('POST', '/api/v1/admin/challenge/milestones', {
    token: adminToken,
    body: {
      id: persistMsId,
      days: 364,
      title: 'E2E Persist Gate',
      rewardLabel: '+1',
      coinReward: 1,
      badge: null,
      enabled: true,
    },
  });
  createdMs.status < 300 && createdMs.json?.id === persistMsId
    ? pass('admin create milestone row')
    : fail(
        'admin create milestone row',
        `HTTP ${createdMs.status} ${JSON.stringify(createdMs.json)?.slice(0, 180)}`,
      );

  const updatedMs = await req(
    'PUT',
    `/api/v1/admin/challenge/milestones/${persistMsId}`,
    {
      token: adminToken,
      body: {
        id: persistMsId,
        days: 364,
        title: 'E2E Persist Gate Edited',
        rewardLabel: '+2',
        coinReward: 2,
        badge: null,
        enabled: false,
      },
    },
  );
  const afterMsUpdate = await req('GET', '/api/v1/admin/challenge', {
    token: adminToken,
  });
  const msRow = afterMsUpdate.json?.milestones?.find(
    (m: { id?: string }) => m.id === persistMsId,
  );
  updatedMs.status < 300 &&
  msRow?.title === 'E2E Persist Gate Edited' &&
  msRow?.enabled === false &&
  msRow?.coinReward === 2
    ? pass('admin update+toggle milestone persists')
    : fail(
        'admin update+toggle milestone persists',
        `HTTP ${updatedMs.status} ${JSON.stringify(msRow)?.slice(0, 180)}`,
      );

  const rulesOnly = await req('PUT', '/api/v1/admin/challenge', {
    token: adminToken,
    body: { rules: saveBody.rules },
  });
  const afterRules = await req('GET', '/api/v1/admin/challenge', {
    token: adminToken,
  });
  rulesOnly.status < 300 &&
  afterRules.json?.quiz?.some((q: { id?: string }) => q.id === persistId) &&
  afterRules.json?.quiz?.some((q: { id?: string }) => q.id === 'e2e_q1') &&
  afterRules.json?.milestones?.some((m: { id?: string }) => m.id === persistMsId) &&
  afterRules.json?.milestones?.some((m: { id?: string }) => m.id === 'e2e_m7')
    ? pass('rules-only save keeps quiz + milestones')
    : fail(
        'rules-only save keeps quiz + milestones',
        `HTTP ${rulesOnly.status} quiz=${JSON.stringify(afterRules.json?.quiz)?.slice(0, 120)} ms=${JSON.stringify(afterRules.json?.milestones)?.slice(0, 120)}`,
      );

  const deletedQuiz = await req(
    'DELETE',
    `/api/v1/admin/challenge/quiz/${persistId}`,
    { token: adminToken },
  );
  const deletedMs = await req(
    'DELETE',
    `/api/v1/admin/challenge/milestones/${persistMsId}`,
    { token: adminToken },
  );
  const afterDelete = await req('GET', '/api/v1/admin/challenge', {
    token: adminToken,
  });
  deletedQuiz.status < 300 &&
  deletedMs.status < 300 &&
  !afterDelete.json?.quiz?.some((q: { id?: string }) => q.id === persistId) &&
  !afterDelete.json?.milestones?.some((m: { id?: string }) => m.id === persistMsId)
    ? pass('admin delete quiz + milestone rows')
    : fail(
        'admin delete quiz + milestone rows',
        `HTTP quiz=${deletedQuiz.status} ms=${deletedMs.status}`,
      );

  // Admin response includes correctIndex; user today must NOT
  const today = await req('GET', '/api/v1/challenge/today', { token: userToken });
  const q = today.json?.question;
  const todayQid = q?.id as string | undefined;
  today.status < 300 &&
  (todayQid === 'e2e_q1' || todayQid === 'e2e_q2') &&
  q.correctIndex === undefined &&
  !JSON.stringify(q).includes('correctIndex')
    ? pass('user today hides correctIndex', `qid=${todayQid}`)
    : fail(
        'user today hides correctIndex',
        JSON.stringify(q)?.slice(0, 200),
      );
  if (!todayQid) throw new Error('no today question id');
  const todayCorrect = todayQid === 'e2e_q1' ? 1 : 1; // both e2e qs use index 1
  const todayWrong = 0;

  // Correct answer first (no prior wrong → not locked)
  const ok = await req('POST', '/api/v1/challenge/quiz/submit', {
    token: userToken,
    body: { questionId: todayQid, selectedIndex: todayCorrect },
  });
  ok.status < 300 && ok.json?.correct === true
    ? pass('quiz correct graded server-side', `delta=${ok.json?.delta}`)
    : fail('quiz correct graded server-side', JSON.stringify(ok.json));

  // After correct: further submits blocked (no extra wrong penalty)
  {
    const r = await req('POST', '/api/v1/challenge/quiz/submit', {
      token: userToken,
      body: { questionId: todayQid, selectedIndex: todayWrong },
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
        { idempotencyKey: { startsWith: `quiz:second:${other.id}:${day}` } },
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
          { idempotencyKey: { startsWith: `quiz:second:${other.id}:${day}` } },
        ],
      },
    });
    const w1 = await req('POST', '/api/v1/challenge/quiz/submit', {
      token: otherToken,
      body: { questionId: todayQid, selectedIndex: todayWrong },
    });
    w1.status < 300 && w1.json?.correct === false
      ? pass('quiz wrong graded server-side', `delta=${w1.json?.delta}`)
      : fail('quiz wrong graded server-side', JSON.stringify(w1.json));
    const w2 = await req('POST', '/api/v1/challenge/quiz/submit', {
      token: otherToken,
      body: { questionId: todayQid, selectedIndex: todayWrong },
    });
    w2.status === 409 && w2.json?.error?.code === 'CHALLENGE_QUIZ_LOCKED'
      ? pass('server enforces wrong-answer lock')
      : fail(
          'server enforces wrong-answer lock',
          `w2=${w2.status} ${w2.json?.error?.code}`,
        );

    // Second-chance before lock ends → still locked
    {
      const early = await req('POST', '/api/v1/challenge/quiz/second-chance', {
        token: otherToken,
      });
      early.status === 409 && early.json?.error?.code === 'CHALLENGE_QUIZ_LOCKED'
        ? pass('second-chance blocked during lock')
        : fail(
            'second-chance blocked during lock',
            `HTTP ${early.status} ${early.json?.error?.code}`,
          );
    }

    // Backdate wrong ledger past lock minutes → NEED_SECOND_CHANCE on submit
    const wrongRow = await prisma.walletLedger.findFirst({
      where: {
        userId: other.id,
        idempotencyKey: { startsWith: `earn:quiz:wrong:${other.id}:${day}:` },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (wrongRow) {
      await prisma.walletLedger.update({
        where: { id: wrongRow.id },
        data: { createdAt: new Date(Date.now() - 25 * 60 * 1000) },
      });
    }
    {
      const afterLock = await req('POST', '/api/v1/challenge/quiz/submit', {
        token: otherToken,
        body: { questionId: todayQid, selectedIndex: todayWrong },
      });
      afterLock.status === 409 &&
      afterLock.json?.error?.code === 'CHALLENGE_NEED_SECOND_CHANCE'
        ? pass('after lock, submit requires second-chance')
        : fail(
            'after lock, submit requires second-chance',
            `HTTP ${afterLock.status} ${afterLock.json?.error?.code}`,
          );
    }

    const unlocked = await req('POST', '/api/v1/challenge/quiz/second-chance', {
      token: otherToken,
    });
    const scQ = unlocked.json?.question;
    const scOk =
      unlocked.status < 300 &&
      scQ?.id &&
      scQ.id !== todayQid &&
      (scQ.id === 'e2e_q1' || scQ.id === 'e2e_q2');
    scOk
      ? pass('second-chance unlocks different question', `from=${todayQid} to=${scQ.id}`)
      : fail(
          'second-chance unlocks different question',
          `HTTP ${unlocked.status} ${JSON.stringify(unlocked.json)?.slice(0, 200)}`,
        );

    // Idempotent unlock
    {
      const again = await req('POST', '/api/v1/challenge/quiz/second-chance', {
        token: otherToken,
      });
      again.status < 300 &&
      again.json?.alreadyUnlocked === true &&
      again.json?.question?.id === scQ?.id
        ? pass('second-chance unlock is idempotent')
        : fail(
            'second-chance unlock is idempotent',
            `HTTP ${again.status} ${JSON.stringify(again.json)?.slice(0, 160)}`,
          );
    }

    // Today payload shows second-chance question
    {
      const t2 = await req('GET', '/api/v1/challenge/today', { token: otherToken });
      t2.status < 300 &&
      t2.json?.question?.id === scQ?.id &&
      t2.json?.quizState?.secondChanceUnlocked === true
        ? pass('today returns second-chance question')
        : fail(
            'today returns second-chance question',
            JSON.stringify({
              q: t2.json?.question?.id,
              state: t2.json?.quizState,
            })?.slice(0, 200),
          );
    }

    // Old today Q rejected; new Q correct earns coins
    {
      const bad = await req('POST', '/api/v1/challenge/quiz/submit', {
        token: otherToken,
        body: { questionId: todayQid, selectedIndex: todayCorrect },
      });
      bad.status === 409 && bad.json?.error?.code === 'CHALLENGE_WRONG_QUESTION'
        ? pass('after unlock, old question rejected')
        : fail(
            'after unlock, old question rejected',
            `HTTP ${bad.status} ${bad.json?.error?.code}`,
          );
    }
    if (scQ?.id) {
      const scCorrect = 1;
      const win = await req('POST', '/api/v1/challenge/quiz/submit', {
        token: otherToken,
        body: { questionId: scQ.id, selectedIndex: scCorrect },
      });
      win.status < 300 && win.json?.correct === true
        ? pass('second-chance correct earns coins', `delta=${win.json?.delta}`)
        : fail('second-chance correct earns coins', JSON.stringify(win.json));
    }
  }

  // Second-chance only for wrong answers (fresh user, no wrong)
  {
    const clean = await prisma.user.upsert({
      where: { email: 'e2e.challenge.clean@example.com' },
      update: { isActive: true, coins: 40 },
      create: {
        googleSub: 'e2e-challenge-clean',
        email: 'e2e.challenge.clean@example.com',
        displayName: 'E2E Clean',
        isActive: true,
        coins: 40,
      },
    });
    await prisma.walletLedger.deleteMany({
      where: {
        userId: clean.id,
        OR: [
          { idempotencyKey: { startsWith: `earn:quiz:` } },
          { idempotencyKey: { startsWith: `quiz:second:` } },
        ],
      },
    });
    const cleanToken = jwt.sign(
      { sub: clean.id, email: clean.email, aud: 'user' },
      userSecret,
      { expiresIn: '1h' },
    );
    const r = await req('POST', '/api/v1/challenge/quiz/second-chance', {
      token: cleanToken,
    });
    r.status === 409 && r.json?.error?.code === 'CHALLENGE_NO_WRONG'
      ? pass('second-chance requires prior wrong')
      : fail(
          'second-chance requires prior wrong',
          `HTTP ${r.status} ${r.json?.error?.code}`,
        );
  }

  // Single-question bank → no alternate second chance
  {
    const solo = await prisma.user.upsert({
      where: { email: 'e2e.challenge.solo@example.com' },
      update: { isActive: true, coins: 40 },
      create: {
        googleSub: 'e2e-challenge-solo',
        email: 'e2e.challenge.solo@example.com',
        displayName: 'E2E Solo',
        isActive: true,
        coins: 40,
      },
    });
    await prisma.walletLedger.deleteMany({
      where: {
        userId: solo.id,
        OR: [
          { idempotencyKey: { startsWith: `earn:quiz:` } },
          { idempotencyKey: { startsWith: `quiz:second:` } },
        ],
      },
    });
    const soloSave = await req('PUT', '/api/v1/admin/challenge', {
      token: adminToken,
      body: {
        rules: { ...saveBody.rules, wrongAnswerLockMinutes: 20 },
        quiz: [saveBody.quiz[0]],
        milestones: saveBody.milestones,
      },
    });
    if (soloSave.status >= 300) {
      fail('solo bank save', JSON.stringify(soloSave.json)?.slice(0, 120));
    } else {
      const soloToken = jwt.sign(
        { sub: solo.id, email: solo.email, aud: 'user' },
        userSecret,
        { expiresIn: '1h' },
      );
      const soloToday = await req('GET', '/api/v1/challenge/today', {
        token: soloToken,
      });
      const soloQid = soloToday.json?.question?.id;
      const w = await req('POST', '/api/v1/challenge/quiz/submit', {
        token: soloToken,
        body: { questionId: soloQid, selectedIndex: 0 },
      });
      if (w.status < 300 && w.json?.correct === false) {
        const row = await prisma.walletLedger.findFirst({
          where: {
            userId: solo.id,
            idempotencyKey: {
              startsWith: `earn:quiz:wrong:${solo.id}:${day}:`,
            },
          },
        });
        if (row) {
          await prisma.walletLedger.update({
            where: { id: row.id },
            data: { createdAt: new Date(Date.now() - 25 * 60 * 1000) },
          });
        }
        const sc = await req('POST', '/api/v1/challenge/quiz/second-chance', {
          token: soloToken,
        });
        sc.status === 409 && sc.json?.error?.code === 'CHALLENGE_NO_SECOND_Q'
          ? pass('single-question bank blocks second-chance')
          : fail(
              'single-question bank blocks second-chance',
              `HTTP ${sc.status} ${sc.json?.error?.code}`,
            );
      } else {
        fail('solo wrong for bank test', JSON.stringify(w.json));
      }
    }
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
