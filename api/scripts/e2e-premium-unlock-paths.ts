/**
 * E2E: admin checkboxes for coin vs watch-ad Premium unlock paths.
 */
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import { CONFIG_ID } from '../src/challenge/challenge-shared';

const API = process.env.API_BASE ?? 'http://127.0.0.1:4000';
const ROOT = path.join(__dirname, '../..');
const prisma = new PrismaClient();
const TAG = `e2e_pu_paths_${Date.now()}`;

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
  const panel = read(
    'admin/src/components/economy/EconomyPremiumUnlockPanel.tsx',
  );
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
  checks.admin_checkboxes =
    /Unlock with coins/.test(panel) && /Watch ad to unlock/.test(panel);
  checks.app_dialog_flags =
    /showCoinUnlock/.test(dialog) && /showAdUnlock/.test(dialog);
  checks.app_parse_flags =
    /coinUnlockEnabled/.test(apiKt) && /adUnlockEnabled/.test(apiKt);
  checks.app_guards =
    /coinUnlockEnabled/.test(screen) && /adUnlockEnabled/.test(screen);

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

  await prisma.challengeConfig.upsert({
    where: { id: CONFIG_ID },
    update: {
      premiumUnlockCoinEnabled: false,
      premiumUnlockAdEnabled: true,
      premiumUnlockBestCoins: 100,
    },
    create: {
      id: CONFIG_ID,
      premiumUnlockCoinEnabled: false,
      premiumUnlockAdEnabled: true,
      premiumUnlockBestCoins: 100,
    },
  });

  const user = await prisma.user.create({
    data: {
      googleSub: `e2e-pu-paths-${TAG}`,
      email: `e2e.pu.paths.${TAG}@local.test`,
      displayName: 'E2E PU Paths',
      isActive: true,
      coins: 500,
    },
  });
  const tok = tokenFor(user);

  try {
    const prices = await req('GET', '/api/v1/economy/premium-unlock-prices', {
      token: tok,
    });
    const pj = prices.json as {
      coinUnlockEnabled?: boolean;
      adUnlockEnabled?: boolean;
    };
    detail.prices = { status: prices.status, body: pj };
    checks.public_ad_only =
      prices.status === 200 &&
      pj.coinUnlockEnabled === false &&
      pj.adUnlockEnabled === true;

    const spend = await req('POST', '/api/v1/economy/premium-unlock', {
      token: tok,
      body: {
        product: 'best_premium',
        requestId: `paths-coin-off-${TAG}`,
      },
    });
    const sj = spend.json as {
      error?: { code?: string };
      code?: string;
    };
    const code = sj.error?.code ?? sj.code;
    detail.spend = { status: spend.status, code };
    checks.coin_spend_blocked =
      spend.status === 403 && code === 'PREMIUM_UNLOCK_COIN_DISABLED';

    // Coin-only path
    await prisma.challengeConfig.update({
      where: { id: CONFIG_ID },
      data: {
        premiumUnlockCoinEnabled: true,
        premiumUnlockAdEnabled: false,
      },
    });
    const prices2 = await req('GET', '/api/v1/economy/premium-unlock-prices', {
      token: tok,
    });
    const p2 = prices2.json as {
      coinUnlockEnabled?: boolean;
      adUnlockEnabled?: boolean;
    };
    detail.prices2 = { status: prices2.status, body: p2 };
    checks.public_coin_only =
      prices2.status === 200 &&
      p2.coinUnlockEnabled === true &&
      p2.adUnlockEnabled === false;

    const spendOk = await req('POST', '/api/v1/economy/premium-unlock', {
      token: tok,
      body: {
        product: 'best_premium',
        requestId: `paths-coin-on-${TAG}`,
      },
    });
    const so = spendOk.json as { cost?: number; coins?: number };
    detail.spendOk = { status: spendOk.status, ...so };
    checks.coin_spend_ok =
      (spendOk.status === 200 || spendOk.status === 201) && so.cost === 100;

    // Both on
    await prisma.challengeConfig.update({
      where: { id: CONFIG_ID },
      data: {
        premiumUnlockCoinEnabled: true,
        premiumUnlockAdEnabled: true,
      },
    });
    const prices3 = await req('GET', '/api/v1/economy/premium-unlock-prices', {
      token: tok,
    });
    const p3 = prices3.json as {
      coinUnlockEnabled?: boolean;
      adUnlockEnabled?: boolean;
    };
    checks.public_both =
      prices3.status === 200 &&
      p3.coinUnlockEnabled === true &&
      p3.adUnlockEnabled === true;
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
    }
    await prisma.$disconnect();
  }

  const failed = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  const ok = failed.length === 0;
  console.log(JSON.stringify({ ok, checks, failed, detail }, null, 2));
  console.log(
    ok ? 'PREMIUM_UNLOCK_PATHS_OK' : 'PREMIUM_UNLOCK_PATHS_FAIL',
  );
  process.exit(ok ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  console.log('PREMIUM_UNLOCK_PATHS_FAIL');
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
