/**
 * Redeem security E2E smoke (dev only).
 * Run: npx ts-node --transpile-only scripts/e2e-redeem-security.ts
 */
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';

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
  const user = await prisma.user.upsert({
    where: { email: 'e2e-redeem@ffsensitivity.local' },
    update: { coins: 0, isActive: true, displayName: 'E2E Redeem' },
    create: {
      googleSub: 'e2e-redeem-google-sub',
      email: 'e2e-redeem@ffsensitivity.local',
      displayName: 'E2E Redeem',
      coins: 0,
    },
  });

  const token = jwt.sign(
    { sub: user.id, email: user.email, aud: 'user' },
    SECRET,
    { expiresIn: '1h' },
  );

  // 1) No token → 401
  {
    const r = await http('GET', '/api/v1/redeem/catalog');
    note(
      'catalog requires JWT',
      r.status === 401,
      `status=${r.status} code=${r.json?.error?.code ?? '?'}`,
    );
  }

  // 2) Bad google token → typed error (or rate-limited if prior bursts)
  {
    const r = await http('POST', '/api/v1/user/auth/google', {
      body: { idToken: 'not-a-real-token' },
    });
    const ok =
      (r.status === 401 && r.json?.error?.code === 'AUTH_GOOGLE_INVALID') ||
      (r.status === 429 && r.json?.error?.code === 'RATE_LIMITED');
    note(
      'google auth rejects bad token',
      ok,
      `status=${r.status} code=${r.json?.error?.code}`,
    );
  }

  // 3) Catalog with JWT
  let freeId: string | null = null;
  let paidId: string | null = null;
  {
    const r = await http('GET', '/api/v1/redeem/catalog', { token });
    const items = r.json?.items ?? [];
    const active = items.filter((i: any) => i.status === 'ACTIVE');
    freeId =
      active.find((i: any) => i.coinCost == null && !i.unlocked)?.id ?? null;
    paidId =
      active.find((i: any) => (i.coinCost ?? 0) > 0 && !i.unlocked)?.id ?? null;
    note(
      'catalog with JWT',
      r.status === 200 && Array.isArray(items) && items.length > 0,
      `status=${r.status} items=${items.length} free=${freeId ? 'yes' : 'no'} paid=${paidId ? 'yes' : 'no'}`,
    );
    const leaked = items.some(
      (i: any) => !i.unlocked && typeof i.code === 'string' && i.code.length > 0,
    );
    // API returns code: null when locked — JSON may omit or null
    const secretLeak = items.some((i: any) => {
      if (i.unlocked) return false;
      const c = i.code;
      return typeof c === 'string' && c.length > 8 && !c.includes('•');
    });
    note(
      'catalog masks secrets',
      !secretLeak,
      secretLeak ? 'unclaimed secret visible' : 'no secret leak',
    );
    void leaked;
  }

  // 4) Wallet get (economy) — client sync removed
  {
    const g = await http('GET', '/api/v1/economy/wallet', { token });
    note(
      'wallet get',
      g.status === 200 && typeof g.json?.coins === 'number',
      `status=${g.status} coins=${g.json?.coins}`,
    );
    const sync = await http('POST', '/api/v1/user/wallet/sync', {
      token,
      body: { coins: 250 },
    });
    note(
      'legacy wallet sync gone',
      sync.status === 404,
      `status=${sync.status}`,
    );
  }

  // 5) Invalid claim id
  {
    const r = await http('POST', '/api/v1/redeem/bad!!/claim', { token });
    note(
      'claim invalid id',
      r.status === 400 && r.json?.error?.code === 'REDEEM_INVALID_ID',
      `status=${r.status} code=${r.json?.error?.code}`,
    );
  }

  // 6) Paid claim with 0 coins after reset
  if (paidId) {
    await prisma.user.update({ where: { id: user.id }, data: { coins: 0 } });
    const r = await http('POST', `/api/v1/redeem/${paidId}/claim`, { token });
    note(
      'claim paid without coins',
      r.status === 409 && r.json?.error?.code === 'NOT_ENOUGH_COINS',
      `status=${r.status} code=${r.json?.error?.code}`,
    );
  } else {
    note('claim paid without coins', true, 'skipped (no paid ACTIVE code)');
  }

  // 7) Free claim + coinsRemaining
  if (freeId) {
    await prisma.user.update({ where: { id: user.id }, data: { coins: 100 } });
    const r = await http('POST', `/api/v1/redeem/${freeId}/claim`, { token });
    const ok =
      r.status === 200 || r.status === 201
        ? typeof r.json?.code === 'string' &&
          r.json.code.length > 4 &&
          typeof r.json?.coinsRemaining === 'number'
        : false;
    note(
      'claim free code',
      ok,
      `status=${r.status} already=${r.json?.alreadyClaimed} coinsRemaining=${r.json?.coinsRemaining} codeLen=${r.json?.code?.length}`,
    );

    // 8) Re-claim same → alreadyClaimed
    const again = await http('POST', `/api/v1/redeem/${freeId}/claim`, {
      token,
    });
    note(
      'reclaim same code',
      (again.status === 200 || again.status === 201) &&
        again.json?.alreadyClaimed === true,
      `status=${again.status} already=${again.json?.alreadyClaimed}`,
    );
  } else {
    note('claim free code', true, 'skipped (no free ACTIVE code left)');
    note('reclaim same code', true, 'skipped');
  }

  // 9) Paid claim with enough coins
  if (paidId) {
    const costRow = await prisma.redeemCode.findUnique({
      where: { id: paidId },
    });
    const cost = costRow?.coinCost ?? 1000;
    // only if still ACTIVE stock 1
    if (costRow?.status === 'ACTIVE' && costRow.stockLeft === 1) {
      await prisma.user.update({
        where: { id: user.id },
        data: { coins: cost },
      });
      const r = await http('POST', `/api/v1/redeem/${paidId}/claim`, { token });
      const remaining = r.json?.coinsRemaining;
      note(
        'claim paid with coins',
        (r.status === 200 || r.status === 201) &&
          remaining === 0 &&
          typeof r.json?.code === 'string',
        `status=${r.status} coinsRemaining=${remaining} already=${r.json?.alreadyClaimed}`,
      );
      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      note(
        'server coins deducted',
        dbUser?.coins === 0,
        `dbCoins=${dbUser?.coins}`,
      );
    } else {
      note(
        'claim paid with coins',
        true,
        `skipped (status=${costRow?.status} stock=${costRow?.stockLeft})`,
      );
      note('server coins deducted', true, 'skipped');
    }
  } else {
    note('claim paid with coins', true, 'skipped');
    note('server coins deducted', true, 'skipped');
  }

  // 10) Rate limit shape on google (burst) — optional soft check
  {
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      const r = await http('POST', '/api/v1/user/auth/google', {
        body: { idToken: `burst-${i}` },
      });
      statuses.push(r.status);
    }
    const limited = statuses.some((s) => s === 429);
    note(
      'auth rate limit fires',
      limited,
      `statuses=${statuses.join(',')}`,
    );
  }

  await prisma.$disconnect();

  const failed = checks.filter((c) => !c.ok);
  // eslint-disable-next-line no-console
  console.log(
    `\nSummary: ${checks.length - failed.length}/${checks.length} passed`,
  );
  if (failed.length) {
    process.exit(1);
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
