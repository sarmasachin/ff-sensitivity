/**
 * Full economy + redeem security E2E.
 * npx ts-node --transpile-only scripts/e2e-full-security.ts
 */
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const BASE = process.env.API_BASE ?? 'http://127.0.0.1:4000';
const SECRET =
  process.env.JWT_USER_SECRET ?? 'dev-user-jwt-secret-change-me-min-32-chars!!';

type Check = { name: string; ok: boolean; detail: string };
const checks: Check[] = [];

function note(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail });
  // eslint-disable-next-line no-console
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} — ${detail}`);
}

async function http(
  method: string,
  path: string,
  opts?: { token?: string; body?: unknown; rawToken?: string },
) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(opts?.token
        ? { Authorization: `Bearer ${opts.token}` }
        : opts?.rawToken
          ? { Authorization: opts.rawToken }
          : {}),
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
  const prisma = new PrismaClient();
  const stamp = Date.now();
  const user = await prisma.user.create({
    data: {
      googleSub: `e2e-full-${stamp}`,
      email: `e2e-full-${stamp}@ffsensitivity.local`,
      displayName: 'E2E Full',
      coins: 0,
      streakDays: 0,
    },
  });
  const token = jwt.sign(
    { sub: user.id, email: user.email, aud: 'user' },
    SECRET,
    { expiresIn: '1h' },
  );
  const adminish = jwt.sign(
    { sub: user.id, email: user.email, aud: 'admin' },
    SECRET,
    { expiresIn: '1h' },
  );

  // --- Auth / guard ---
  {
    const r = await http('GET', '/api/v1/economy/wallet');
    note('wallet requires JWT', r.status === 401, `status=${r.status}`);
  }
  {
    const r = await http('GET', '/api/v1/economy/wallet', {
      token: 'not.a.jwt',
    });
    note('wallet rejects garbage JWT', r.status === 401, `status=${r.status}`);
  }
  {
    const r = await http('GET', '/api/v1/economy/wallet', { token: adminish });
    note(
      'wallet rejects wrong audience',
      r.status === 401,
      `status=${r.status} code=${r.json?.error?.code}`,
    );
  }
  {
    const r = await http('POST', '/api/v1/user/auth/google', {
      body: { idToken: 'fake' },
    });
    note(
      'google bad token',
      r.status === 401 && r.json?.error?.code === 'AUTH_GOOGLE_INVALID',
      `code=${r.json?.error?.code}`,
    );
  }

  // --- Insecure paths gone ---
  {
    const r = await http('POST', '/api/v1/user/wallet/sync', {
      token,
      body: { coins: 999999 },
    });
    note('client sync removed', r.status === 404, `status=${r.status}`);
  }

  // --- Economy earn path ---
  {
    const r = await http('POST', '/api/v1/economy/challenge/earn', {
      token,
      body: { kind: 'CHECKIN' },
    });
    note(
      'checkin +20',
      (r.status === 201 || r.status === 200) && r.json?.coins === 20,
      `coins=${r.json?.coins}`,
    );
  }
  {
    const r = await http('POST', '/api/v1/economy/challenge/earn', {
      token,
      body: { kind: 'CHECKIN' },
    });
    note(
      'checkin no double credit',
      r.json?.alreadyApplied === true && r.json?.coins === 20,
      `already=${r.json?.alreadyApplied} coins=${r.json?.coins}`,
    );
  }
  {
    const blocked = await http('POST', '/api/v1/economy/challenge/earn', {
      token,
      body: { kind: 'QUIZ', correct: true },
    });
    note(
      'quiz forge via economy blocked',
      blocked.status === 400 &&
        blocked.json?.error?.code === 'ECONOMY_QUIZ_MOVED',
      `status=${blocked.status} code=${blocked.json?.error?.code}`,
    );
    const today = await http('GET', '/api/v1/challenge/today', { token });
    const qid = today.json?.question?.id as string | undefined;
    // Find correct index from DB for e2e (server grades)
    const row = qid
      ? await prisma.challengeQuizQuestion.findUnique({ where: { id: qid } })
      : null;
    const r = await http('POST', '/api/v1/challenge/quiz/submit', {
      token,
      body: {
        questionId: qid ?? 'missing',
        selectedIndex: row?.correctIndex ?? 0,
      },
    });
    note(
      'quiz graded submit',
      (r.status === 201 || r.status === 200) && r.json?.correct === true,
      `coins=${r.json?.coins} correct=${r.json?.correct}`,
    );
  }
  {
    // Forbidden unknown fields → ValidationPipe reject (more secure than ignoring)
    const forged = await http('POST', '/api/v1/economy/challenge/earn', {
      token,
      body: { kind: 'AD', amount: 50000, coins: 50000 },
    });
    note(
      'earn rejects forged amount fields',
      forged.status === 400 && forged.json?.error?.code === 'VALIDATION_ERROR',
      `status=${forged.status} code=${forged.json?.error?.code}`,
    );
    const before = (
      await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    ).coins;
    const r = await http('POST', '/api/v1/economy/challenge/earn', {
      token,
      body: { kind: 'AD' },
    });
    note(
      'ad +30 fixed amount',
      (r.status === 201 || r.status === 200) && r.json?.delta === 30,
      `status=${r.status} delta=${r.json?.delta} before=${before}`,
    );
  }
  {
    const r = await http('POST', '/api/v1/economy/challenge/earn', {
      token,
      body: { kind: 'MILESTONE', milestoneDays: 7 },
    });
    note(
      'milestone blocked without streak',
      r.status === 409 && r.json?.error?.code === 'ECONOMY_STREAK_REQUIRED',
      `code=${r.json?.error?.code}`,
    );
  }
  {
    const r = await http('POST', '/api/v1/economy/challenge/earn', {
      token,
      body: { kind: 'HACK' },
    });
    note(
      'invalid earn kind rejected',
      r.status === 400,
      `status=${r.status} code=${r.json?.error?.code}`,
    );
  }

  // --- Shop security ---
  {
    const r = await http('POST', '/api/v1/economy/shop/purchase', {
      token,
      body: { itemId: 'cosmetic_gold_wallet', requestId: randomUUID() },
    });
    note(
      'shop spend 100',
      (r.status === 201 || r.status === 200) && r.json?.coins === 0,
      `coins=${r.json?.coins}`,
    );
  }
  {
    const r = await http('POST', '/api/v1/economy/shop/purchase', {
      token,
      body: {
        itemId: 'cosmetic_gold_wallet',
        requestId: randomUUID(),
        priceCoins: 1,
      },
    });
    note(
      'shop rejects client price field',
      r.status === 400 && r.json?.error?.code === 'VALIDATION_ERROR',
      `status=${r.status} code=${r.json?.error?.code}`,
    );
    const again = await http('POST', '/api/v1/economy/shop/purchase', {
      token,
      body: { itemId: 'cosmetic_gold_wallet', requestId: randomUUID() },
    });
    note(
      'shop oneTime blocked',
      again.status === 409 && again.json?.error?.code === 'SHOP_ALREADY_OWNED',
      `code=${again.json?.error?.code}`,
    );
  }
  {
    const r = await http('POST', '/api/v1/economy/shop/purchase', {
      token,
      body: { itemId: 'not_real_item', requestId: randomUUID() },
    });
    note(
      'shop unknown item',
      r.status === 404 && r.json?.error?.code === 'SHOP_ITEM_NOT_FOUND',
      `code=${r.json?.error?.code}`,
    );
  }
  {
    const r = await http('POST', '/api/v1/economy/shop/purchase', {
      token,
      body: { itemId: 'boost_quiz_double', requestId: randomUUID() },
    });
    note(
      'shop insufficient coins',
      r.status === 409 && r.json?.error?.code === 'NOT_ENOUGH_COINS',
      `code=${r.json?.error?.code}`,
    );
  }

  // Retry same requestId must not double charge
  {
    await prisma.user.update({ where: { id: user.id }, data: { coins: 80 } });
    const reqId = randomUUID();
    const a = await http('POST', '/api/v1/economy/shop/purchase', {
      token,
      body: { itemId: 'boost_quiz_double', requestId: reqId },
    });
    const b = await http('POST', '/api/v1/economy/shop/purchase', {
      token,
      body: { itemId: 'boost_quiz_double', requestId: reqId },
    });
    const db = await prisma.user.findUnique({ where: { id: user.id } });
    note(
      'shop retry same requestId idempotent',
      (a.status === 201 || a.status === 200) &&
        b.json?.alreadyApplied === true &&
        db?.coins === 0,
      `a=${a.json?.coins} bAlready=${b.json?.alreadyApplied} db=${db?.coins}`,
    );
  }

  // --- Redeem security ---
  const free = await prisma.redeemCode.findFirst({
    where: {
      status: 'ACTIVE',
      stockLeft: 1,
      coinCost: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });
  const paid = await prisma.redeemCode.findFirst({
    where: {
      status: 'ACTIVE',
      stockLeft: 1,
      coinCost: { gt: 0 },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  {
    const r = await http('GET', '/api/v1/redeem/catalog', { token });
    const items = r.json?.items ?? [];
    const leak = items.some(
      (i: any) =>
        !i.unlocked &&
        typeof i.code === 'string' &&
        i.code.length > 8 &&
        !String(i.code).includes('•'),
    );
    note(
      'catalog masks secrets',
      r.status === 200 && !leak,
      `items=${items.length} leak=${leak}`,
    );
  }
  {
    const r = await http('POST', '/api/v1/redeem/!!bad!!/claim', { token });
    note(
      'claim invalid id',
      r.status === 400 && r.json?.error?.code === 'REDEEM_INVALID_ID',
      `code=${r.json?.error?.code}`,
    );
  }
  if (paid) {
    await prisma.user.update({ where: { id: user.id }, data: { coins: 0 } });
    const r = await http('POST', `/api/v1/redeem/${paid.id}/claim`, { token });
    note(
      'paid redeem without coins',
      r.status === 409 && r.json?.error?.code === 'NOT_ENOUGH_COINS',
      `code=${r.json?.error?.code}`,
    );
  } else {
    note('paid redeem without coins', true, 'skipped (no paid ACTIVE)');
  }
  if (free) {
    await prisma.user.update({ where: { id: user.id }, data: { coins: 50 } });
    const r = await http('POST', `/api/v1/redeem/${free.id}/claim`, { token });
    note(
      'free redeem claim',
      (r.status === 201 || r.status === 200) &&
        typeof r.json?.code === 'string' &&
        typeof r.json?.coinsRemaining === 'number',
      `status=${r.status} coinsRemaining=${r.json?.coinsRemaining}`,
    );
  } else {
    note('free redeem claim', true, 'skipped (no free ACTIVE left)');
  }

  // --- Rate limit ---
  {
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      const r = await http('POST', '/api/v1/user/auth/google', {
        body: { idToken: `burst-full-${i}` },
      });
      statuses.push(r.status);
    }
    note(
      'auth rate limit',
      statuses.some((s) => s === 429),
      `statuses=${statuses.filter((s, i) => i >= 8).join(',')}`,
    );
  }

  // Ledger audit row exists for shop
  {
    const rows = await prisma.walletLedger.count({ where: { userId: user.id } });
    note('ledger rows written', rows >= 3, `rows=${rows}`);
  }

  await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
  await prisma.$disconnect();

  const failed = checks.filter((c) => !c.ok);
  // eslint-disable-next-line no-console
  console.log(
    `\nSummary: ${checks.length - failed.length}/${checks.length} passed`,
  );
  if (failed.length) {
    failed.forEach((f) => console.error(` - ${f.name}: ${f.detail}`));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
