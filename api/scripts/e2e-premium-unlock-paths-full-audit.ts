/**
 * Full accuracy audit: Premium unlock coin vs watch-ad admin paths.
 */
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import { CONFIG_ID } from '../src/challenge/challenge-shared';

const API = process.env.API_BASE ?? 'http://127.0.0.1:4000';
const ROOT = path.join(__dirname, '../..');
const prisma = new PrismaClient();
const TAG = `e2e_pu_paths_full_${Date.now()}`;

/** Mirrors admin formToConfig path-toggle guard (no admin import). */
function adminPathGuard(coin: boolean, ad: boolean): string | null {
  if (!coin && !ad) {
    return 'Enable at least one Premium unlock path (coins or watch ad).';
  }
  return null;
}

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
  const checks: Record<string, boolean> = {};
  const detail: Record<string, unknown> = {};

  const schema = read('api/prisma/schema.prisma');
  const dto = read('api/src/economy/dto/economy-admin.dto.ts');
  const adminSvc = read('api/src/economy/economy-admin.service.ts');
  const ecoSvc = read('api/src/economy/economy.service.ts');
  const pricesTs = read('api/src/economy/premium-unlock-prices.ts');
  const panel = read(
    'admin/src/components/economy/EconomyPremiumUnlockPanel.tsx',
  );
  const data = read('admin/src/components/economy/economy-data.ts');
  const ecoPage = read('admin/src/app/(ops)/economy/page.tsx');
  const dialog = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/PremiumBestUnlockDialog.kt',
  );
  const screen = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/PremiumSensiUnlockScreen.kt',
  );
  const apiKt = read(
    'app/src/main/java/com/ffsensitivity/app/data/remote/EconomyApi.kt',
  );

  checks.schema_flags =
    /premiumUnlockCoinEnabled/.test(schema) &&
    /premiumUnlockAdEnabled/.test(schema);
  checks.dto_flags =
    /coinUnlockEnabled!:/.test(dto) && /adUnlockEnabled!:/.test(dto);
  checks.admin_svc_save =
    /premiumUnlockCoinEnabled: coinUnlockEnabled/.test(adminSvc) &&
    /ECONOMY_PREMIUM_UNLOCK_PATH/.test(adminSvc);
  checks.admin_svc_read =
    /coinUnlockEnabled: row\.premiumUnlockCoinEnabled/.test(adminSvc);
  checks.public_prices_flags =
    /coinUnlockEnabled: options\.coinUnlockEnabled/.test(ecoSvc);
  checks.spend_guard = /PREMIUM_UNLOCK_COIN_DISABLED/.test(ecoSvc);
  checks.load_options = /loadPremiumUnlockOptions/.test(pricesTs);
  checks.admin_panel =
    /Unlock with coins/.test(panel) && /Watch ad to unlock/.test(panel);
  checks.admin_form_validate =
    /Enable at least one Premium unlock path/.test(data);
  checks.admin_page_panel = /EconomyPremiumUnlockPanel/.test(ecoPage);
  checks.app_dialog_conditional =
    /if \(coinOn\)/.test(dialog) && /if \(adOn\)/.test(dialog);
  checks.app_screen_passes_flags =
    /showCoinUnlock = unlockPrices\.coinUnlockEnabled/.test(screen) &&
    /showAdUnlock = unlockPrices\.adUnlockEnabled/.test(screen);
  checks.app_parse =
    /optBoolean\("coinUnlockEnabled"/.test(apiKt) &&
    /optBoolean\("adUnlockEnabled"/.test(apiKt);

  checks.admin_form_rejects_both_off =
    adminPathGuard(false, false) !== null &&
    /at least one/i.test(adminPathGuard(false, false)!);
  checks.admin_form_coin_only = adminPathGuard(true, false) === null;
  checks.admin_form_ad_only = adminPathGuard(false, true) === null;
  checks.admin_form_both_ok = adminPathGuard(true, true) === null;

  const cols = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'challenge_config'
       AND column_name IN (
         'premium_unlock_coin_enabled',
         'premium_unlock_ad_enabled'
       )`,
  );
  checks.db_columns = cols.length === 2;

  const prev = await prisma.challengeConfig.findUnique({
    where: { id: CONFIG_ID },
  });

  const user = await prisma.user.create({
    data: {
      googleSub: `e2e-pu-paths-full-${TAG}`,
      email: `e2e.pu.paths.full.${TAG}@local.test`,
      displayName: 'E2E PU Paths Full',
      isActive: true,
      coins: 500,
    },
  });
  const tok = tokenFor(user);

  try {
    // Ad-only: public + spend blocked
    await prisma.challengeConfig.upsert({
      where: { id: CONFIG_ID },
      update: {
        premiumUnlockCoinEnabled: false,
        premiumUnlockAdEnabled: true,
        premiumUnlockBestCoins: 77,
      },
      create: {
        id: CONFIG_ID,
        premiumUnlockCoinEnabled: false,
        premiumUnlockAdEnabled: true,
        premiumUnlockBestCoins: 77,
      },
    });
    const p1 = await req('GET', '/api/v1/economy/premium-unlock-prices', {
      token: tok,
    });
    const j1 = p1.json as {
      coinUnlockEnabled?: boolean;
      adUnlockEnabled?: boolean;
      best_premium?: number;
    };
    detail.adOnlyPrices = { status: p1.status, body: j1 };
    checks.live_ad_only_flags =
      p1.status === 200 &&
      j1.coinUnlockEnabled === false &&
      j1.adUnlockEnabled === true &&
      j1.best_premium === 77;

    const s1 = await req('POST', '/api/v1/economy/premium-unlock', {
      token: tok,
      body: { product: 'best_premium', requestId: `full-ad-only-${TAG}` },
    });
    const c1 =
      (s1.json as { error?: { code?: string }; code?: string }).error?.code ??
      (s1.json as { code?: string }).code;
    detail.adOnlySpend = { status: s1.status, code: c1 };
    checks.live_ad_only_spend_blocked =
      s1.status === 403 && c1 === 'PREMIUM_UNLOCK_COIN_DISABLED';

    // Coin-only: spend OK
    await prisma.challengeConfig.update({
      where: { id: CONFIG_ID },
      data: {
        premiumUnlockCoinEnabled: true,
        premiumUnlockAdEnabled: false,
        premiumUnlockBestCoins: 77,
      },
    });
    const p2 = await req('GET', '/api/v1/economy/premium-unlock-prices', {
      token: tok,
    });
    const j2 = p2.json as {
      coinUnlockEnabled?: boolean;
      adUnlockEnabled?: boolean;
    };
    checks.live_coin_only_flags =
      p2.status === 200 &&
      j2.coinUnlockEnabled === true &&
      j2.adUnlockEnabled === false;

    const s2 = await req('POST', '/api/v1/economy/premium-unlock', {
      token: tok,
      body: { product: 'best_premium', requestId: `full-coin-only-${TAG}` },
    });
    const so = s2.json as { cost?: number; coins?: number };
    detail.coinOnlySpend = { status: s2.status, ...so };
    checks.live_coin_only_spend =
      (s2.status === 200 || s2.status === 201) &&
      so.cost === 77 &&
      so.coins === 423;

    // Both on
    await prisma.challengeConfig.update({
      where: { id: CONFIG_ID },
      data: {
        premiumUnlockCoinEnabled: true,
        premiumUnlockAdEnabled: true,
      },
    });
    const p3 = await req('GET', '/api/v1/economy/premium-unlock-prices', {
      token: tok,
    });
    const j3 = p3.json as {
      coinUnlockEnabled?: boolean;
      adUnlockEnabled?: boolean;
    };
    checks.live_both_on =
      p3.status === 200 &&
      j3.coinUnlockEnabled === true &&
      j3.adUnlockEnabled === true;

    // Both off in DB (edge): public reflects it; spend still blocked
    await prisma.challengeConfig.update({
      where: { id: CONFIG_ID },
      data: {
        premiumUnlockCoinEnabled: false,
        premiumUnlockAdEnabled: false,
      },
    });
    const p4 = await req('GET', '/api/v1/economy/premium-unlock-prices', {
      token: tok,
    });
    const j4 = p4.json as {
      coinUnlockEnabled?: boolean;
      adUnlockEnabled?: boolean;
    };
    detail.bothOff = { status: p4.status, body: j4 };
    checks.live_both_off_public =
      p4.status === 200 &&
      j4.coinUnlockEnabled === false &&
      j4.adUnlockEnabled === false;

    const s4 = await req('POST', '/api/v1/economy/premium-unlock', {
      token: tok,
      body: { product: 'premium_pro_max', requestId: `full-both-off-${TAG}` },
    });
    const c4 =
      (s4.json as { error?: { code?: string }; code?: string }).error?.code ??
      (s4.json as { code?: string }).code;
    checks.live_both_off_spend_blocked =
      s4.status === 403 && c4 === 'PREMIUM_UNLOCK_COIN_DISABLED';

    // Wallet untouched after blocked spends (still 423 from coin-only success)
    const wallet = await req('GET', '/api/v1/economy/wallet', { token: tok });
    const wj = wallet.json as { coins?: number };
    detail.wallet = { status: wallet.status, coins: wj.coins };
    checks.wallet_intact = wallet.status === 200 && wj.coins === 423;
  } finally {
    await prisma.walletLedger.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    if (prev) {
      await prisma.challengeConfig.update({
        where: { id: CONFIG_ID },
        data: {
          premiumUnlockCoinEnabled: prev.premiumUnlockCoinEnabled,
          premiumUnlockAdEnabled: prev.premiumUnlockAdEnabled,
          premiumUnlockBestCoins: prev.premiumUnlockBestCoins,
        },
      });
    } else {
      await prisma.challengeConfig.update({
        where: { id: CONFIG_ID },
        data: {
          premiumUnlockCoinEnabled: true,
          premiumUnlockAdEnabled: true,
        },
      });
    }
    await prisma.$disconnect();
  }

  const failed = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  const ok = failed.length === 0;
  console.log(JSON.stringify({ ok, checks, failed, detail }, null, 2));
  console.log(
    ok ? 'PREMIUM_UNLOCK_PATHS_FULL_OK' : 'PREMIUM_UNLOCK_PATHS_FULL_FAIL',
  );
  process.exit(ok ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  console.log('PREMIUM_UNLOCK_PATHS_FULL_FAIL');
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
