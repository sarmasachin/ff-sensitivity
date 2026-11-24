/**
 * Full accuracy audit: admin-set Premium unlock prices.
 * Static wire + DB columns + live GET/POST + edge cases.
 */
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import { CONFIG_ID } from '../src/challenge/challenge-shared';
import { PREMIUM_UNLOCK_DEFAULT_COINS } from '../src/economy/premium-unlock-prices';

const API = process.env.API_BASE ?? 'http://127.0.0.1:4000';
const ROOT = path.join(__dirname, '../..');
const prisma = new PrismaClient();
const TAG = `e2e_pu_full_${Date.now()}`;

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

function read(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
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
  const checks: Record<string, boolean | number | string> = {};
  const detail: Record<string, unknown> = {};

  // ----- STATIC -----
  const schema = read('api/prisma/schema.prisma');
  const adminPage = read('admin/src/app/(ops)/economy/page.tsx');
  const adminData = read('admin/src/components/economy/economy-data.ts');
  const adminPanel = read(
    'admin/src/components/economy/EconomyPremiumUnlockPanel.tsx',
  );
  const adminDto = read('api/src/economy/dto/economy-admin.dto.ts');
  const adminSvc = read('api/src/economy/economy-admin.service.ts');
  const ctrl = read('api/src/economy/economy.controller.ts');
  const svc = read('api/src/economy/economy.service.ts');
  const pricesTs = read('api/src/economy/premium-unlock-prices.ts');
  const ecoApi = read(
    'app/src/main/java/com/ffsensitivity/app/data/remote/EconomyApi.kt',
  );
  const ecoRepo = read(
    'app/src/main/java/com/ffsensitivity/app/data/remote/EconomyRepository.kt',
  );
  const screen = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/PremiumSensiUnlockScreen.kt',
  );

  checks.schema_cols =
    /premiumUnlockBestCoins/.test(schema) &&
    /premiumUnlockProMaxCoins/.test(schema) &&
    /premiumUnlockOneTapCoins/.test(schema);
  checks.admin_page_panel = /EconomyPremiumUnlockPanel/.test(adminPage);
  checks.admin_form_fields =
    /premiumUnlockBest/.test(adminData) &&
    /premiumUnlock:\s*\{/.test(adminData);
  checks.admin_panel_ui =
    /Best Premium/.test(adminPanel) && /One Tap Premium/.test(adminPanel);
  checks.admin_dto =
    /EconomyPremiumUnlockDto/.test(adminDto) &&
    /premiumUnlock!:/.test(adminDto);
  checks.admin_svc_save =
    /premiumUnlockBestCoins:\s*best/.test(adminSvc) &&
    /premiumUnlockOneTapCoins:\s*oneTap/.test(adminSvc);
  checks.api_get_prices = /premium-unlock-prices/.test(ctrl);
  checks.api_load_db = /loadPremiumUnlockPrices/.test(svc);
  checks.api_cost_from_admin = /premiumUnlockCost\(prices/.test(svc);
  checks.api_clamp = /clampPremiumUnlockCoins/.test(pricesTs);
  checks.app_get_prices = /premium-unlock-prices/.test(ecoApi);
  checks.app_repo_prices = /fun premiumUnlockPrices/.test(ecoRepo);
  checks.app_dialog_remote =
    /unlockPrices\.bestPremium/.test(screen) &&
    /unlockPrices\.premiumProMax/.test(screen) &&
    /unlockPrices\.oneTapPremium/.test(screen);
  checks.app_no_hardcoded_dialog_cost =
    !/coinCost\s*=\s*BEST_PREMIUM_UNLOCK_COINS/.test(screen) &&
    !/coinCost\s*=\s*PREMIUM_PRO_MAX_UNLOCK_COINS/.test(screen) &&
    !/coinCost\s*=\s*ONE_TAP_PREMIUM_UNLOCK_COINS/.test(screen);
  checks.app_still_server_spend = /EconomyRepository\.premiumUnlock\(/.test(
    screen,
  );

  // DB column live
  const cols = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'challenge_config'
       AND column_name IN (
         'premium_unlock_best_coins',
         'premium_unlock_pro_max_coins',
         'premium_unlock_one_tap_coins'
       )`,
  );
  checks.db_columns = cols.length === 3;

  // Snapshot previous prices to restore
  const prev = await prisma.challengeConfig.findUnique({
    where: { id: CONFIG_ID },
  });

  await prisma.challengeConfig.upsert({
    where: { id: CONFIG_ID },
    update: {
      premiumUnlockBestCoins: 111,
      premiumUnlockProMaxCoins: 222,
      premiumUnlockOneTapCoins: 0, // free coin-unlock edge
    },
    create: {
      id: CONFIG_ID,
      premiumUnlockBestCoins: 111,
      premiumUnlockProMaxCoins: 222,
      premiumUnlockOneTapCoins: 0,
    },
  });

  const rich = await prisma.user.create({
    data: {
      googleSub: `e2e-pu-full-rich-${TAG}`,
      email: `e2e.pu.full.rich.${TAG}@local.test`,
      displayName: 'E2E PU Full Rich',
      isActive: true,
      coins: 500,
    },
  });
  const poor = await prisma.user.create({
    data: {
      googleSub: `e2e-pu-full-poor-${TAG}`,
      email: `e2e.pu.full.poor.${TAG}@local.test`,
      displayName: 'E2E PU Full Poor',
      isActive: true,
      coins: 50,
    },
  });
  const richTok = tokenFor(rich);
  const poorTok = tokenFor(poor);

  try {
    const prices = await req('GET', '/api/v1/economy/premium-unlock-prices', {
      token: richTok,
    });
    const pj = prices.json as Record<string, number>;
    detail.prices = { status: prices.status, body: pj };
    checks.live_prices =
      prices.status === 200 &&
      pj.best_premium === 111 &&
      pj.premium_pro_max === 222 &&
      pj.one_tap_premium === 0;

    const best = await req('POST', '/api/v1/economy/premium-unlock', {
      token: richTok,
      body: { product: 'best_premium', requestId: `full-best-${TAG}` },
    });
    const bj = best.json as { cost?: number; coins?: number };
    detail.best = { status: best.status, ...bj };
    checks.debit_best_111 = bj.cost === 111 && bj.coins === 389;

    const pm = await req('POST', '/api/v1/economy/premium-unlock', {
      token: richTok,
      body: { product: 'premium_pro_max', requestId: `full-pm-${TAG}` },
    });
    const pmj = pm.json as { cost?: number; coins?: number };
    detail.pm = { status: pm.status, ...pmj };
    checks.debit_pm_222 = pmj.cost === 222 && pmj.coins === 167;

    // Free One Tap (admin 0) — coins unchanged
    const beforeOt = (
      await prisma.user.findUniqueOrThrow({ where: { id: rich.id } })
    ).coins;
    const ot = await req('POST', '/api/v1/economy/premium-unlock', {
      token: richTok,
      body: { product: 'one_tap_premium', requestId: `full-ot-${TAG}` },
    });
    const otj = ot.json as { cost?: number; coins?: number };
    detail.ot_free = { status: ot.status, ...otj, before: beforeOt };
    checks.debit_ot_free_0 = otj.cost === 0 && otj.coins === beforeOt;

    // Poor cannot afford 111
    const poorTry = await req('POST', '/api/v1/economy/premium-unlock', {
      token: poorTok,
      body: { product: 'best_premium', requestId: `full-poor-${TAG}` },
    });
    const poorBody = poorTry.json as {
      error?: { code?: string };
      code?: string;
    };
    const poorCode = poorBody.error?.code ?? poorBody.code;
    detail.poor = { status: poorTry.status, code: poorCode };
    checks.poor_409 = poorTry.status === 409 && poorCode === 'NOT_ENOUGH_COINS';

    // Idempotent
    const idem = await req('POST', '/api/v1/economy/premium-unlock', {
      token: richTok,
      body: { product: 'best_premium', requestId: `full-best-${TAG}` },
    });
    const ij = idem.json as { alreadyApplied?: boolean; coins?: number };
    detail.idem = { status: idem.status, ...ij };
    // Idempotent replay: flag + original cost; coins = live wallet (after later spends).
    checks.idempotent =
      ij.alreadyApplied === true &&
      (idem.json as { cost?: number }).cost === 111 &&
      ij.coins === 167;

    const wallet = await req('GET', '/api/v1/economy/wallet', {
      token: richTok,
    });
    const wj = wallet.json as { coins?: number };
    checks.wallet_final = wallet.status === 200 && wj.coins === 167;
  } finally {
    await prisma.walletLedger.deleteMany({
      where: { userId: { in: [rich.id, poor.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [rich.id, poor.id] } },
    });
    await prisma.challengeConfig.update({
      where: { id: CONFIG_ID },
      data: {
        premiumUnlockBestCoins:
          prev?.premiumUnlockBestCoins ??
          PREMIUM_UNLOCK_DEFAULT_COINS.best_premium,
        premiumUnlockProMaxCoins:
          prev?.premiumUnlockProMaxCoins ??
          PREMIUM_UNLOCK_DEFAULT_COINS.premium_pro_max,
        premiumUnlockOneTapCoins:
          prev?.premiumUnlockOneTapCoins ??
          PREMIUM_UNLOCK_DEFAULT_COINS.one_tap_premium,
      },
    });
    await prisma.$disconnect();
  }

  const failed = Object.entries(checks)
    .filter(([, v]) => v === false)
    .map(([k]) => k);
  const ok = failed.length === 0;
  console.log(JSON.stringify({ ok, checks, failed, detail }, null, 2));
  console.log(
    ok ? 'PREMIUM_UNLOCK_ADMIN_FULL_OK' : 'PREMIUM_UNLOCK_ADMIN_FULL_FAIL',
  );
  process.exit(ok ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  console.log('PREMIUM_UNLOCK_ADMIN_FULL_FAIL');
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
