/**
 * Quiz load/submit e2e — the "Quiz not loaded yet. Reopen Daily Challenge" client bug.
 * npx ts-node --transpile-only scripts/e2e-quiz-load.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const API = process.env.API_BASE ?? 'http://127.0.0.1:4000';
const SECRET = process.env.JWT_USER_SECRET;
if (!SECRET) throw new Error('JWT_USER_SECRET missing');

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

function quizQuestionReady(id: string): boolean {
  const t = id.trim();
  return t.length > 0 && t.toLowerCase() !== 'loading';
}

function cachedReadyQuiz(
  id: string | undefined,
  cacheDay: string | null,
  today: string,
): boolean {
  return !!id && quizQuestionReady(id) && cacheDay === today;
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
  quizQuestionReady('loading') === false
    ? pass('placeholder id is not ready')
    : fail('placeholder id is not ready');
  quizQuestionReady('') === false
    ? pass('blank id is not ready')
    : fail('blank id is not ready');
  quizQuestionReady('q_real') === true
    ? pass('real id is ready')
    : fail('real id is ready');
  cachedReadyQuiz('q_old', '2026-08-22', '2026-08-23') === false
    ? pass('yesterday cache is not ready')
    : fail('yesterday cache is not ready');
  cachedReadyQuiz('q_today', '2026-08-23', '2026-08-23') === true
    ? pass('today cache is ready')
    : fail('today cache is ready');

  const prisma = new PrismaClient();
  const stamp = Date.now();
  const user = await prisma.user.create({
    data: {
      googleSub: `e2e-quiz-load-${stamp}`,
      email: `e2e-quiz-load-${stamp}@ffsensitivity.local`,
      displayName: 'E2E Quiz Load',
      coins: 50,
      streakDays: 0,
    },
  });
  const live = jwt.sign(
    { sub: user.id, email: user.email, aud: 'user', tv: 0 },
    SECRET,
    { expiresIn: '1h' },
  );
  const expired = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      aud: 'user',
      tv: 0,
      exp: Math.floor(Date.now() / 1000) - 120,
    },
    SECRET,
  );

  const today = await req('GET', '/api/v1/challenge/today', { token: live });
  const qid = today.json?.question?.id as string | undefined;
  const options = today.json?.question?.options as string[] | undefined;
  today.status === 200 && quizQuestionReady(qid ?? '') && (options?.length ?? 0) >= 2
    ? pass('today returns a real question', `qid=${qid} opts=${options?.length}`)
    : fail(
        'today returns a real question',
        `HTTP ${today.status} qid=${qid} code=${today.json?.error?.code}`,
      );

  {
    const r = await req('POST', '/api/v1/challenge/quiz/submit', {
      token: live,
      body: { questionId: 'loading', selectedIndex: 0 },
    });
    const code = r.json?.error?.code;
    r.status >= 400 &&
    code !== undefined &&
    code !== 'Unauthorized' &&
    code !== 'CHALLENGE_QUIZ_NOT_READY'
      ? pass(
          'submit placeholder id is rejected by API (not client reopen msg)',
          `HTTP ${r.status} ${code}`,
        )
      : fail(
          'submit placeholder id is rejected by API (not client reopen msg)',
          `HTTP ${r.status} ${code} ${r.json?.error?.message}`,
        );
  }
  {
    const r = await req('GET', '/api/v1/challenge/today', { token: expired });
    r.status === 401 && r.json?.error?.code === 'AUTH_REQUIRED'
      ? pass('expired today is AUTH_REQUIRED not quiz-not-loaded', r.json?.error?.code)
      : fail(
          'expired today is AUTH_REQUIRED not quiz-not-loaded',
          `HTTP ${r.status} ${r.json?.error?.code}`,
        );
  }
  {
    const r = await req('POST', '/api/v1/challenge/quiz/submit', {
      token: expired,
      body: { questionId: qid ?? 'x', selectedIndex: 0 },
    });
    r.status === 401 && r.json?.error?.code === 'AUTH_REQUIRED'
      ? pass('expired submit is AUTH_REQUIRED not quiz-not-loaded', r.json?.error?.message)
      : fail(
          'expired submit is AUTH_REQUIRED not quiz-not-loaded',
          `HTTP ${r.status} ${r.json?.error?.code}`,
        );
  }

  if (qid && today.status === 200) {
    const r = await req('POST', '/api/v1/challenge/quiz/submit', {
      token: live,
      body: { questionId: qid, selectedIndex: 0 },
    });
    r.status < 300 && typeof r.json?.correct === 'boolean'
      ? pass('live submit with real qid works', `correct=${r.json.correct} delta=${r.json.delta}`)
      : fail(
          'live submit with real qid works',
          `HTTP ${r.status} ${JSON.stringify(r.json)?.slice(0, 180)}`,
        );
  } else {
    fail('live submit with real qid works', 'skipped — no today question');
  }

  await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
  await prisma.$disconnect();

  const failed = checks.filter((c) => !c.ok);
  console.log(`\nSummary: ${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) {
    failed.forEach((f) => console.error(` - ${f.name}: ${f.detail}`));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
