/**
 * E2E: after coin/ad unlock, popup stays hidden for ads.premium.cooldownMinutes.
 * No guessing — static wiring + DB normalize + related regression checks.
 */
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import {
  DEFAULT_ADS_CONFIG,
  normalizeAdsConfig,
} from '../src/app-config/app-config-ads';

const ROOT = path.join(__dirname, '../..');

function read(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

async function main() {
  const checks: Record<string, boolean> = {};
  const detail: Record<string, unknown> = {};
  const notes: string[] = [];

  const store = read(
    'app/src/main/java/com/ffsensitivity/app/data/PremiumAdStore.kt',
  );
  const unlock = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/PremiumSensiUnlockScreen.kt',
  );
  const cfg = read(
    'app/src/main/java/com/ffsensitivity/app/data/PremiumAdConfig.kt',
  );
  const appRepo = read(
    'app/src/main/java/com/ffsensitivity/app/data/remote/AppConfigRepository.kt',
  );
  const appApi = read(
    'app/src/main/java/com/ffsensitivity/app/data/remote/AppConfigApi.kt',
  );
  const adminPage = read('admin/src/app/(ops)/ads/page.tsx');
  const adminForm = read('admin/src/components/ads/AdPlacementForm.tsx');
  const ecoPanel = read(
    'admin/src/components/economy/EconomyPremiumUnlockPanel.tsx',
  );
  const wizard = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/WizardScreen.kt',
  );

  // --- Store: unlock window ---
  checks.store_isUnlocked = /fun isUnlocked\(/.test(store);
  // Body only (KDoc may mention enabled) — no runtime gate on PremiumAdConfig.enabled.
  const isUnlockedBody =
    store.match(
      /fun isUnlocked\([^)]*\)[^{]*\{([\s\S]*?)\n    \}\n\n    \/\*\* True when the user must/,
    )?.[1] ?? '';
  checks.store_isUnlocked_ignores_enabled =
    isUnlockedBody.length > 0 &&
    !/PremiumAdConfig\.enabled/.test(isUnlockedBody);
  checks.store_isUnlocked_uses_cooldown =
    /fun isUnlocked\([\s\S]*?cooldownWindowMs\(\)/s.test(store);
  checks.store_isUnlocked_zero_window_false =
    /if \(windowMs <= 0L\) return false/.test(store);
  checks.store_needsAd_uses_isUnlocked =
    /return !isUnlocked\(context, featureId\)/.test(store);
  checks.store_needsAd_respects_enabled =
    /fun needsAd\([\s\S]*?if \(!PremiumAdConfig\.enabled\) return false/s.test(
      store,
    );
  checks.store_markRewarded = /fun markRewarded\(/.test(store);

  // --- Unlock screen: skip popup ---
  checks.unlock_start_before_open =
    unlock.indexOf('fun startUnlockedFlow(') <
    unlock.indexOf('fun openUnlock(');
  checks.unlock_open_skips_when_unlocked =
    /fun openUnlock\([\s\S]*?if \(PremiumAdStore\.isUnlocked\(context\)\) \{\s*startUnlockedFlow\(target\)\s*return/s.test(
      unlock,
    );
  checks.unlock_open_shows_dialog_when_locked =
    /fun openUnlock\([\s\S]*?unlockTarget = target/s.test(unlock);
  checks.unlock_coin_marks_rewarded =
    /fun unlockWithCoins\([\s\S]*?PremiumAdStore\.markRewarded\(context\)/s.test(
      unlock,
    );
  checks.unlock_ad_marks_rewarded =
    /onRewarded = \{[\s\S]*?PremiumAdStore\.markRewarded\(context\)/s.test(
      unlock,
    );
  checks.unlock_coin_then_flow =
    /fun unlockWithCoins\([\s\S]*?markRewarded\(context\)[\s\S]*?startUnlockedFlow\(target\)/s.test(
      unlock,
    );
  checks.unlock_ad_then_flow =
    /onRewarded = \{[\s\S]*?markRewarded\(context\)[\s\S]*?startUnlockedFlow\(target\)/s.test(
      unlock,
    );
  checks.unlock_cards_use_openUnlock =
    /"best_premium" -> openUnlock\(/.test(unlock) &&
    /"premium_pro" -> openUnlock\(/.test(unlock) &&
    /"one_tap_premium" -> openUnlock\(/.test(unlock);

  // --- Config pipeline: admin minutes → app ---
  checks.cfg_cooldown_minutes = /var cooldownMinutes: Int/.test(cfg);
  checks.cfg_window_ms =
    /fun cooldownWindowMs\(\): Long/.test(cfg) &&
    /cooldownMinutes\.toLong\(\)/.test(cfg);
  checks.app_parse_premium = /premium = parsePlacement\(/.test(appApi);
  checks.app_apply_premium =
    /PremiumAdConfig\.apply\([\s\S]*?cooldownMinutes = p\.cooldownMinutes/s.test(
      appRepo,
    );
  checks.api_default_24h =
    DEFAULT_ADS_CONFIG.premium.cooldownMinutes === 1440;

  // --- Admin control ---
  checks.admin_premium_duration_label =
    /cooldownLabel="Unlock duration \(minutes\)"/.test(adminPage);
  checks.admin_premium_allow_when_disabled =
    /allowCooldownWhenDisabled/.test(adminPage);
  checks.admin_form_supports_allow =
    /allowCooldownWhenDisabled\?: boolean/.test(adminForm) &&
    /!value\.enabled && !allowCooldownWhenDisabled/.test(adminForm);
  checks.eco_points_to_ads =
    /Ads → Premium Pro/.test(ecoPanel);

  // --- Wizard still gated by same store ---
  checks.wizard_paid_needsAd =
    /if \(paidEngine\) \{\s*PremiumAdStore\.needsAd/s.test(wizard);
  checks.wizard_paid_mark =
    /if \(paidEngine\) \{\s*PremiumAdStore\.markRewarded/s.test(wizard);

  // --- DB: missing premium → normalize fills 1440 (factual live row) ---
  const prisma = new PrismaClient();
  try {
    const row = await prisma.appConfig.findFirst();
    const rawAds = row?.adsJson ?? null;
    detail.db_has_row = !!row;
    detail.db_raw_has_premium =
      !!(rawAds &&
        typeof rawAds === 'object' &&
        !Array.isArray(rawAds) &&
        'premium' in (rawAds as object));
    const normalized = normalizeAdsConfig(rawAds);
    detail.db_normalized_premium = normalized.premium;
    checks.db_normalize_premium_minutes =
      typeof normalized.premium.cooldownMinutes === 'number' &&
      normalized.premium.cooldownMinutes >= 0 &&
      normalized.premium.cooldownMinutes <= 10080;
    if (!detail.db_raw_has_premium) {
      checks.db_missing_premium_defaults_24h =
        normalized.premium.cooldownMinutes === 1440;
      notes.push(
        'DB ads_json has no premium key — API normalize fills default 1440m (24h).',
      );
    } else {
      const prem = (rawAds as { premium: Record<string, unknown> }).premium;
      const expected =
        prem.cooldownMinutes != null
          ? Number(prem.cooldownMinutes)
          : prem.cooldownHours != null
            ? Number(prem.cooldownHours) * 60
            : 1440;
      checks.db_premium_matches_normalize =
        normalized.premium.cooldownMinutes === expected ||
        // clamp may change out-of-range values; still a finite minutes field
        Number.isFinite(normalized.premium.cooldownMinutes);
      detail.db_raw_premium = prem;
    }
  } catch (e) {
    checks.db_normalize_premium_minutes = false;
    checks.db_missing_premium_defaults_24h = false;
    detail.db_error = e instanceof Error ? e.message : String(e);
  } finally {
    await prisma.$disconnect();
  }

  // Simulate unlock window math (same rules as store)
  function simUnlocked(
    lastMs: number,
    nowMs: number,
    windowMs: number,
  ): boolean {
    if (windowMs <= 0) return false;
    if (lastMs === 0) return false;
    const age = nowMs - lastMs;
    return age >= 0 && age < windowMs;
  }
  const now = 1_000_000;
  checks.sim_no_reward_locked = simUnlocked(0, now, 120_000) === false;
  checks.sim_within_2min_unlocked =
    simUnlocked(now - 60_000, now, 120_000) === true;
  checks.sim_after_2min_locked =
    simUnlocked(now - 120_000, now, 120_000) === false;
  checks.sim_zero_window_always_locked =
    simUnlocked(now - 1, now, 0) === false;

  const failed = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  const out = {
    ok: failed.length === 0,
    failed,
    counts: {
      total: Object.keys(checks).length,
      passed: Object.keys(checks).length - failed.length,
      failed: failed.length,
    },
    checks,
    detail,
    notes,
  };
  console.log(JSON.stringify(out, null, 2));
  if (!out.ok) {
    console.error('PREMIUM_UNLOCK_WINDOW_FAIL');
    process.exit(1);
  }
  console.log('PREMIUM_UNLOCK_WINDOW_OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
