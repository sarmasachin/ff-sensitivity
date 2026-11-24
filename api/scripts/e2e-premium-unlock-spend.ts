/**
 * Live E2E: Premium Sensi unlock server wallet debit.
 * Prints JSON + PREMIUM_UNLOCK_SPEND_OK / FAIL.
 */
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import { PREMIUM_UNLOCK_COINS } from '../src/economy/premium-unlock-prices';

const API = process.env.API_BASE ?? 'http://127.0.0.1:4000';
const prisma = new PrismaClient();
const TAG = `e2e_pu_${Date.now()}`;

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

function tokenFor(user: { id: string; email: string; tokenVersion: number }) {
  return jwt.sign(
    { sub: user.id, email: user.email, aud: 'user', tv: user.tokenVersion },
    process.env.JWT_USER_SECRET!,
    { expiresIn: '1h' },
  );
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
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

async function main() {
  loadEnv();
  const checks: Record<string, boolean> = {};
  const detail: Record<string, unknown> = {};

  // App constants must match server prices
  const dialog = fs.readFileSync(
    path.join(
      __dirname,
      '../../app/src/main/java/com/ffsensitivity/app/presentation/screens/PremiumBestUnlockDialog.kt',
    ),
    'utf8',
  );
  const screen = fs.readFileSync(
    path.join(
      __dirname,
      '../../app/src/main/java/com/ffsensitivity/app/presentation/screens/PremiumSensiUnlockScreen.kt',
    ),
    'utf8',
  );
  const ecoApi = fs.readFileSync(
    path.join(
      __dirname,
      '../../app/src/main/java/com/ffsensitivity/app/data/remote/EconomyApi.kt',
    ),
    'utf8',
  );
  const ecoRepo = fs.readFileSync(
    path.join(
      __dirname,
      '../../app/src/main/java/com/ffsensitivity/app/data/remote/EconomyRepository.kt',
    ),
    'utf8',
  );

  checks.price_best_100 =
    /BEST_PREMIUM_UNLOCK_COINS\s*=\s*100/.test(dialog) &&
    PREMIUM_UNLOCK_COINS.best_premium === 100;
  checks.price_ot_150 =
    /ONE_TAP_PREMIUM_UNLOCK_COINS\s*=\s*150/.test(dialog) &&
    PREMIUM_UNLOCK_COINS.one_tap_premium === 150;
  checks.price_pm_200 =
    /PREMIUM_PRO_MAX_UNLOCK_COINS\s*=\s*200/.test(dialog) &&
    PREMIUM_UNLOCK_COINS.premium_pro_max === 200;
  checks.app_no_local_spend = !/DailyChallengeStore\.spendCoins/.test(screen);
  checks.app_calls_repo = /EconomyRepository\.premiumUnlock/.test(screen);
  checks.app_api_path = /\/api\/v1\/economy\/premium-unlock/.test(ecoApi);
  checks.app_repo_sync = /DailyChallengeStore\.setCoins/.test(ecoRepo);

  const rich = await prisma.user.create({
    data: {
      googleSub: `e2e-pu-rich-${TAG}`,
      email: `e2e.pu.rich.${TAG}@local.test`,
      displayName: 'E2E PU Rich',
      isActive: true,
      coins: 500,
    },
  });
  const poor = await prisma.user.create({
    data: {
      googleSub: `e2e-pu-poor-${TAG}`,
      email: `e2e.pu.poor.${TAG}@local.test`,
      displayName: 'E2E PU Poor',
      isActive: true,
      coins: 50,
    },
  });
  const frozen = await prisma.user.create({
    data: {
      googleSub: `e2e-pu-frozen-${TAG}`,
      email: `e2e.pu.frozen.${TAG}@local.test`,
      displayName: 'E2E PU Frozen',
      isActive: true,
      coins: 500,
      walletFrozen: true,
    },
  });

  const richTok = tokenFor(rich);
  const poorTok = tokenFor(poor);
  const frozenTok = tokenFor(frozen);
  const reqBest = `pu-best-${TAG}`;
  const reqOt = `pu-ot-${TAG}`;
  const reqPm = `pu-pm-${TAG}`;

  try {
    // Best premium debit 100
    const best1 = await req('POST', '/api/v1/economy/premium-unlock', {
      token: richTok,
      body: { product: 'best_premium', requestId: reqBest },
    });
    const b1 = best1.json as {
      coins?: number;
      cost?: number;
      alreadyApplied?: boolean;
    };
    detail.best1 = { status: best1.status, ...b1 };
    checks.best_status = best1.status === 200 || best1.status === 201;
    checks.best_cost = b1.cost === 100;
    checks.best_coins = b1.coins === 400;
    checks.best_not_idem = b1.alreadyApplied === false;

    // Idempotent retry same requestId
    const best2 = await req('POST', '/api/v1/economy/premium-unlock', {
      token: richTok,
      body: { product: 'best_premium', requestId: reqBest },
    });
    const b2 = best2.json as {
      coins?: number;
      alreadyApplied?: boolean;
    };
    detail.best2 = { status: best2.status, ...b2 };
    checks.best_idem_status = best2.status === 200 || best2.status === 201;
    checks.best_idem_flag = b2.alreadyApplied === true;
    checks.best_idem_coins = b2.coins === 400;

    // One Tap 150 → 250 left
    const ot = await req('POST', '/api/v1/economy/premium-unlock', {
      token: richTok,
      body: { product: 'one_tap_premium', requestId: reqOt },
    });
    const otj = ot.json as { coins?: number; cost?: number };
    detail.ot = { status: ot.status, ...otj };
    checks.ot_ok = (ot.status === 200 || ot.status === 201) && otj.cost === 150 && otj.coins === 250;

    // Pro Max 200 → 50 left
    const pm = await req('POST', '/api/v1/economy/premium-unlock', {
      token: richTok,
      body: { product: 'premium_pro_max', requestId: reqPm },
    });
    const pmj = pm.json as { coins?: number; cost?: number };
    detail.pm = { status: pm.status, ...pmj };
    checks.pm_ok = (pm.status === 200 || pm.status === 201) && pmj.cost === 200 && pmj.coins === 50;

    // Wallet GET matches
    const wallet = await req('GET', '/api/v1/economy/wallet', { token: richTok });
    const wj = wallet.json as { coins?: number };
    detail.wallet = { status: wallet.status, coins: wj.coins };
    checks.wallet_sync = wallet.status === 200 && wj.coins === 50;

    // Ledger rows
    const ledgers = await prisma.walletLedger.count({
      where: {
        userId: rich.id,
        reason: { startsWith: 'premium_unlock:' },
      },
    });
    detail.ledger_count = ledgers;
    checks.ledger_3 = ledgers === 3;

    // Insufficient coins
    const poorTry = await req('POST', '/api/v1/economy/premium-unlock', {
      token: poorTok,
      body: { product: 'best_premium', requestId: `pu-poor-${TAG}` },
    });
    const pj = poorTry.json as {
      code?: string;
      message?: string;
      error?: { code?: string; message?: string };
    };
    const poorCode = pj.error?.code ?? pj.code;
    const poorMsg = pj.error?.message ?? pj.message ?? '';
    detail.poor = { status: poorTry.status, code: poorCode, message: poorMsg };
    checks.poor_409 = poorTry.status === 409;
    checks.poor_code =
      poorCode === 'NOT_ENOUGH_COINS' ||
      String(poorMsg).toLowerCase().includes('need');

    // Frozen wallet
    const fr = await req('POST', '/api/v1/economy/premium-unlock', {
      token: frozenTok,
      body: { product: 'best_premium', requestId: `pu-fr-${TAG}` },
    });
    const fj = fr.json as { code?: string; error?: { code?: string } };
    const frCode = fj.error?.code ?? fj.code;
    detail.frozen = { status: fr.status, code: frCode };
    checks.frozen_403 = fr.status === 403;
    checks.frozen_code = frCode === 'WALLET_FROZEN';

    // Unauth
    const unauth = await req('POST', '/api/v1/economy/premium-unlock', {
      body: { product: 'best_premium', requestId: `pu-unauth-${TAG}` },
    });
    checks.unauth_401 = unauth.status === 401;
  } finally {
    await prisma.walletLedger.deleteMany({
      where: { userId: { in: [rich.id, poor.id, frozen.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [rich.id, poor.id, frozen.id] } },
    });
    await prisma.$disconnect();
  }

  const failed = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  const ok = failed.length === 0;
  console.log(JSON.stringify({ ok, checks, failed, detail }, null, 2));
  console.log(ok ? 'PREMIUM_UNLOCK_SPEND_OK' : 'PREMIUM_UNLOCK_SPEND_FAIL');
  process.exit(ok ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  console.log('PREMIUM_UNLOCK_SPEND_FAIL');
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
