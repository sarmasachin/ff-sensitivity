/**
 * Admin-set Premium unlock prices → GET prices + debit uses new cost.
 */
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import { CONFIG_ID } from '../src/challenge/challenge-shared';
import { PREMIUM_UNLOCK_DEFAULT_COINS } from '../src/economy/premium-unlock-prices';

const API = process.env.API_BASE ?? 'http://127.0.0.1:4000';
const prisma = new PrismaClient();
const TAG = `e2e_pu_admin_${Date.now()}`;

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

  // Custom admin prices
  await prisma.challengeConfig.upsert({
    where: { id: CONFIG_ID },
    update: {
      premiumUnlockBestCoins: 77,
      premiumUnlockProMaxCoins: 88,
      premiumUnlockOneTapCoins: 99,
    },
    create: {
      id: CONFIG_ID,
      premiumUnlockBestCoins: 77,
      premiumUnlockProMaxCoins: 88,
      premiumUnlockOneTapCoins: 99,
    },
  });

  const user = await prisma.user.create({
    data: {
      googleSub: `e2e-pu-adm-${TAG}`,
      email: `e2e.pu.adm.${TAG}@local.test`,
      displayName: 'E2E PU Admin Prices',
      isActive: true,
      coins: 300,
    },
  });
  const tok = tokenFor(user);

  try {
    const prices = await req('GET', '/api/v1/economy/premium-unlock-prices', {
      token: tok,
    });
    const pj = prices.json as {
      best_premium?: number;
      premium_pro_max?: number;
      one_tap_premium?: number;
    };
    detail.prices = { status: prices.status, ...pj };
    checks.prices_ok =
      (prices.status === 200 || prices.status === 201) &&
      pj.best_premium === 77 &&
      pj.premium_pro_max === 88 &&
      pj.one_tap_premium === 99;

    const spend = await req('POST', '/api/v1/economy/premium-unlock', {
      token: tok,
      body: { product: 'best_premium', requestId: `pu-adm-${TAG}` },
    });
    const sj = spend.json as { coins?: number; cost?: number };
    detail.spend = { status: spend.status, ...sj };
    checks.spend_cost_77 = sj.cost === 77;
    checks.spend_coins_223 = sj.coins === 223; // 300-77

    const ot = await req('POST', '/api/v1/economy/premium-unlock', {
      token: tok,
      body: { product: 'one_tap_premium', requestId: `pu-adm-ot-${TAG}` },
    });
    const otj = ot.json as { coins?: number; cost?: number };
    detail.ot = { status: ot.status, ...otj };
    checks.ot_cost_99 = otj.cost === 99;
    checks.ot_coins = otj.coins === 124; // 223-99

    // Static: admin panel + app fetch present
    const panel = fs.readFileSync(
      path.join(
        __dirname,
        '../../admin/src/components/economy/EconomyPremiumUnlockPanel.tsx',
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
    checks.admin_panel = /EconomyPremiumUnlockPanel|premiumUnlockBest/.test(
      panel,
    );
    checks.app_fetch_prices = /premiumUnlockPrices|unlockPrices/.test(screen);
  } finally {
    await prisma.walletLedger.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    // Restore defaults
    await prisma.challengeConfig.update({
      where: { id: CONFIG_ID },
      data: {
        premiumUnlockBestCoins: PREMIUM_UNLOCK_DEFAULT_COINS.best_premium,
        premiumUnlockProMaxCoins: PREMIUM_UNLOCK_DEFAULT_COINS.premium_pro_max,
        premiumUnlockOneTapCoins: PREMIUM_UNLOCK_DEFAULT_COINS.one_tap_premium,
      },
    });
    await prisma.$disconnect();
  }

  const failed = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  const ok = failed.length === 0;
  console.log(JSON.stringify({ ok, checks, failed, detail }, null, 2));
  console.log(ok ? 'PREMIUM_UNLOCK_ADMIN_PRICES_OK' : 'PREMIUM_UNLOCK_ADMIN_PRICES_FAIL');
  process.exit(ok ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  console.log('PREMIUM_UNLOCK_ADMIN_PRICES_FAIL');
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
