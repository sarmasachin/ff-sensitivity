/**
 * Economy live wire E2E. Run: npx ts-node --transpile-only scripts/e2e-economy.ts
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
  opts?: { token?: string; body?: unknown },
) {
  const res = await fetch(`${BASE}${path}`, {
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
  const prisma = new PrismaClient();
  const email = `e2e-economy-${Date.now()}@ffsensitivity.local`;
  const user = await prisma.user.create({
    data: {
      googleSub: `e2e-economy-${Date.now()}`,
      email,
      displayName: 'E2E Economy',
      coins: 0,
      streakDays: 0,
    },
  });
  const token = jwt.sign(
    { sub: user.id, email: user.email, aud: 'user' },
    SECRET,
    { expiresIn: '1h' },
  );

  // Old insecure sync must be gone
  {
    const r = await http('POST', '/api/v1/user/wallet/sync', {
      token,
      body: { coins: 99999 },
    });
    note(
      'insecure sync removed',
      r.status === 404,
      `status=${r.status}`,
    );
  }

  // Check-in earn
  {
    const r = await http('POST', '/api/v1/economy/challenge/earn', {
      token,
      body: { kind: 'CHECKIN' },
    });
    note(
      'checkin +20',
      (r.status === 200 || r.status === 201) && r.json?.coins === 20,
      `status=${r.status} coins=${r.json?.coins} delta=${r.json?.delta}`,
    );
    const again = await http('POST', '/api/v1/economy/challenge/earn', {
      token,
      body: { kind: 'CHECKIN' },
    });
    note(
      'checkin idempotent',
      (again.status === 200 || again.status === 201) &&
        again.json?.alreadyApplied === true &&
        again.json?.coins === 20,
      `already=${again.json?.alreadyApplied} coins=${again.json?.coins}`,
    );
  }

  // Quiz — client-attested path must be blocked (use /challenge/quiz/submit)
  {
    const r = await http('POST', '/api/v1/economy/challenge/earn', {
      token,
      body: { kind: 'QUIZ', correct: true },
    });
    note(
      'quiz earn moved off economy',
      r.status === 400 && r.json?.error?.code === 'ECONOMY_QUIZ_MOVED',
      `status=${r.status} code=${r.json?.error?.code}`,
    );
  }

  // Server-graded quiz via challenge API
  {
    const today = await http('GET', '/api/v1/challenge/today', { token });
    const qid = today.json?.question?.id as string | undefined;
    const r = await http('POST', '/api/v1/challenge/quiz/submit', {
      token,
      body: { questionId: qid ?? 'missing', selectedIndex: 0 },
    });
    note(
      'quiz submit via challenge',
      (r.status === 200 || r.status === 201) && typeof r.json?.coins === 'number',
      `status=${r.status} coins=${r.json?.coins} correct=${r.json?.correct}`,
    );
  }

  // Ad
  {
    const r = await http('POST', '/api/v1/economy/challenge/earn', {
      token,
      body: { kind: 'AD' },
    });
    note(
      'ad +30',
      (r.status === 200 || r.status === 201) && r.json?.delta === 30,
      `status=${r.status} delta=${r.json?.delta} coins=${r.json?.coins}`,
    );
  }

  // Milestone without streak
  {
    const r = await http('POST', '/api/v1/economy/challenge/earn', {
      token,
      body: { kind: 'MILESTONE', milestoneDays: 7 },
    });
    note(
      'milestone requires streak',
      r.status === 409 && r.json?.error?.code === 'ECONOMY_STREAK_REQUIRED',
      `status=${r.status} code=${r.json?.error?.code}`,
    );
  }

  // Shop purchase gold wallet (100 coins) — top up first
  {
    await prisma.user.update({ where: { id: user.id }, data: { coins: 100 } });
    const r = await http('POST', '/api/v1/economy/shop/purchase', {
      token,
      body: { itemId: 'cosmetic_gold_wallet', requestId: randomUUID() },
    });
    note(
      'shop buy cosmetic',
      (r.status === 200 || r.status === 201) && r.json?.coins === 0,
      `status=${r.status} coins=${r.json?.coins}`,
    );
    const again = await http('POST', '/api/v1/economy/shop/purchase', {
      token,
      body: { itemId: 'cosmetic_gold_wallet', requestId: randomUUID() },
    });
    note(
      'shop oneTime blocked',
      again.status === 409 && again.json?.error?.code === 'SHOP_ALREADY_OWNED',
      `status=${again.status} code=${again.json?.error?.code}`,
    );
  }

  // Boost buy then checkin boost — need coins first
  {
    await prisma.user.update({ where: { id: user.id }, data: { coins: 60 } });
    const buy = await http('POST', '/api/v1/economy/shop/purchase', {
      token,
      body: { itemId: 'boost_checkin_plus', requestId: randomUUID() },
    });
    note(
      'shop buy boost',
      (buy.status === 200 || buy.status === 201) && buy.json?.coins === 0,
      `status=${buy.status} coins=${buy.json?.coins}`,
    );
    // Force new day for checkin by clearing ledger key via new user day hack:
    // delete today's checkin ledger + reset lastCheckinDay so we can earn again
    const day = new Date().toISOString().slice(0, 10);
    await prisma.walletLedger.deleteMany({
      where: { idempotencyKey: `earn:checkin:${user.id}:${day}` },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { lastCheckinDay: null, coins: 0 },
    });
    const r = await http('POST', '/api/v1/economy/challenge/earn', {
      token,
      body: { kind: 'CHECKIN' },
    });
    note(
      'checkin uses boost (+40)',
      (r.status === 200 || r.status === 201) && r.json?.coins === 40,
      `status=${r.status} coins=${r.json?.coins} reason=${r.json?.reason}`,
    );
  }

  // Client cannot inflate via old path; wallet get
  {
    const w = await http('GET', '/api/v1/economy/wallet', { token });
    note(
      'wallet get',
      (w.status === 200 || w.status === 201) && typeof w.json?.coins === 'number',
      `status=${w.status} coins=${w.json?.coins}`,
    );
  }

  await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
  await prisma.$disconnect();

  const failed = checks.filter((c) => !c.ok);
  // eslint-disable-next-line no-console
  console.log(
    `\nSummary: ${checks.length - failed.length}/${checks.length} passed`,
  );
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
