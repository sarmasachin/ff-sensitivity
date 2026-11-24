/**
 * E2E: admin sets ad cooldown in minutes → public config + ad-bonus debit use it.
 */
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import { CONFIG_ID } from '../src/challenge/challenge-shared';
import {
  DEFAULT_ADS_CONFIG,
  normalizeAdsConfig,
} from '../src/app-config/app-config-ads';

const API = process.env.API_BASE ?? 'http://127.0.0.1:4000';
const ROOT = path.join(__dirname, '../..');
const prisma = new PrismaClient();
const TAG = `e2e_ads_min_${Date.now()}`;

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

  const adsTs = read('api/src/app-config/app-config-ads.ts');
  const form = read('admin/src/components/ads/AdPlacementForm.tsx');
  const calc = read(
    'app/src/main/java/com/ffsensitivity/app/data/CalculateAdConfig.kt',
  );
  checks.api_minutes_field = /cooldownMinutes/.test(adsTs);
  checks.admin_ui_minutes = /Cooldown \(minutes\)/.test(form);
  checks.app_minutes = /cooldownMinutes/.test(calc);

  // Legacy hours-only JSON → minutes (no cooldownMinutes key)
  const legacy = normalizeAdsConfig({
    calculate: {
      enabled: true,
      cooldownHours: 2,
      incompleteMessage: DEFAULT_ADS_CONFIG.calculate.incompleteMessage,
      buttonLabel: DEFAULT_ADS_CONFIG.calculate.buttonLabel,
    },
  });
  checks.legacy_hours_to_minutes =
    legacy.calculate.cooldownMinutes === 120 &&
    legacy.calculate.cooldownHours === 2;

  const prevCfg = await prisma.challengeConfig.findUnique({
    where: { id: CONFIG_ID },
  });
  const prevAds = await prisma.appConfig.findUnique({ where: { id: 1 } });

  await prisma.challengeConfig.upsert({
    where: { id: CONFIG_ID },
    update: {
      adBonusOptional: true,
      adBonusCooldownMinutes: 7,
      adBonusCooldownHours: 1,
      adBonusCoins: 5,
    },
    create: {
      id: CONFIG_ID,
      adBonusOptional: true,
      adBonusCooldownMinutes: 7,
      adBonusCooldownHours: 1,
      adBonusCoins: 5,
    },
  });

  // Patch stored ads JSON with minute cooldowns
  const adsBundle = {
    ...DEFAULT_ADS_CONFIG,
    calculate: {
      ...DEFAULT_ADS_CONFIG.calculate,
      cooldownMinutes: 15,
      cooldownHours: 1,
    },
    adBonus: {
      ...DEFAULT_ADS_CONFIG.adBonus,
      cooldownMinutes: 7,
      cooldownHours: 1,
    },
  };
  if (prevAds) {
    await prisma.appConfig.update({
      where: { id: 1 },
      data: { adsJson: adsBundle as object },
    });
  }

  const user = await prisma.user.create({
    data: {
      googleSub: `e2e-ads-min-${TAG}`,
      email: `e2e.ads.min.${TAG}@local.test`,
      displayName: 'E2E Ads Min',
      isActive: true,
      coins: 10,
    },
  });
  const tok = tokenFor(user);

  try {
    const pub = await req('GET', '/api/v1/app/config');
    const ads = (pub.json as { ads?: { calculate?: { cooldownMinutes?: number; cooldownHours?: number }; adBonus?: { cooldownMinutes?: number } } }).ads;
    detail.publicAds = { status: pub.status, calculate: ads?.calculate, adBonus: ads?.adBonus };
    checks.public_calculate_15 =
      pub.status === 200 && ads?.calculate?.cooldownMinutes === 15;
    checks.public_adbonus_7 =
      pub.status === 200 && ads?.adBonus?.cooldownMinutes === 7;

    // First claim OK
    const earn1 = await req('POST', '/api/v1/economy/challenge/earn', {
      token: tok,
      body: { kind: 'AD' },
    });
    detail.earn1 = { status: earn1.status, body: earn1.json };
    checks.earn1_ok = earn1.status === 200 || earn1.status === 201;

    // Immediate second claim → cooldown (~7 min)
    const earn2 = await req('POST', '/api/v1/economy/challenge/earn', {
      token: tok,
      body: { kind: 'AD' },
    });
    const e2 = earn2.json as {
      error?: { code?: string; details?: { nextAdAvailableAtMs?: number } };
      code?: string;
      details?: { nextAdAvailableAtMs?: number };
    };
    const code = e2.error?.code ?? e2.code;
    const nextAt =
      e2.error?.details?.nextAdAvailableAtMs ?? e2.details?.nextAdAvailableAtMs;
    detail.earn2 = { status: earn2.status, code, nextAt, body: earn2.json };
    checks.earn2_cooldown =
      earn2.status === 409 && code === 'ECONOMY_AD_COOLDOWN';
    if (typeof nextAt === 'number' && checks.earn1_ok) {
      const deltaMin = (nextAt - Date.now()) / 60000;
      detail.cooldownDeltaMin = deltaMin;
      // Allow ~6–8 min remaining for clock skew
      checks.cooldown_about_7_min = deltaMin > 5.5 && deltaMin < 8.5;
    } else {
      checks.cooldown_about_7_min = false;
    }

    const today = await req('GET', '/api/v1/challenge/today', { token: tok });
    const tj = today.json as { nextAdAvailableAtMs?: number | null };
    detail.today = {
      status: today.status,
      nextAdAvailableAtMs: tj.nextAdAvailableAtMs,
    };
    checks.today_has_next =
      today.status === 200 &&
      typeof tj.nextAdAvailableAtMs === 'number' &&
      tj.nextAdAvailableAtMs! > Date.now();
  } finally {
    await prisma.walletLedger.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    if (prevCfg) {
      await prisma.challengeConfig.update({
        where: { id: CONFIG_ID },
        data: {
          adBonusCooldownMinutes: prevCfg.adBonusCooldownMinutes,
          adBonusCooldownHours: prevCfg.adBonusCooldownHours,
          adBonusCoins: prevCfg.adBonusCoins,
          adBonusOptional: prevCfg.adBonusOptional,
        },
      });
    }
    if (prevAds) {
      await prisma.appConfig.update({
        where: { id: 1 },
        data: { adsJson: prevAds.adsJson as object },
      });
    }
    await prisma.$disconnect();
  }

  const failed = Object.entries(checks)
    .filter(([, v]) => v === false)
    .map(([k]) => k);
  const ok = failed.length === 0;
  console.log(JSON.stringify({ ok, checks, failed, detail }, null, 2));
  console.log(ok ? 'ADS_COOLDOWN_MINUTES_OK' : 'ADS_COOLDOWN_MINUTES_FAIL');
  process.exit(ok ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  console.log('ADS_COOLDOWN_MINUTES_FAIL');
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
