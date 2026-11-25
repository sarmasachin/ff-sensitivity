/**
 * Pro features (Best Premium / Pro Max / One Tap) + all AdMob unit wiring.
 * Source + BuildConfig release fields — no device fill guess.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '../..');

function read(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function readIf(rel: string): string | null {
  const p = path.join(ROOT, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

function prop(src: string, key: string): string | null {
  const m = src.match(new RegExp(`^${key}=(.+)$`, 'm'));
  return m?.[1]?.trim() ?? null;
}

function main() {
  const checks: Record<string, boolean> = {};
  const detail: Record<string, unknown> = {};
  const notes: string[] = [];

  const premium = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/PremiumSensiUnlockScreen.kt',
  );
  const facade = read(
    'app/src/main/java/com/ffsensitivity/app/ads/CalculateRewardedAds.kt',
  );
  const local = read('local.properties');
  const tools = read('tools/admob-ids.local');
  const releaseBc = readIf(
    'app/build/generated/source/buildConfig/release/com/ffsensitivity/app/BuildConfig.java',
  );
  const checkIn = read(
    'app/src/main/java/com/ffsensitivity/app/ads/CheckInInterstitialAds.kt',
  );
  const quiz = read(
    'app/src/main/java/com/ffsensitivity/app/ads/QuizInterstitialAds.kt',
  );
  const redeem = read(
    'app/src/main/java/com/ffsensitivity/app/ads/RedeemDailyInterstitialAds.kt',
  );

  const expected: Record<string, string> = {
    ADMOB_REWARDED_CALCULATE: 'ca-app-pub-9467977262277079/7298120567',
    ADMOB_REWARDED_DPI: 'ca-app-pub-9467977262277079/8756426486',
    ADMOB_REWARDED_PREMIUM: 'ca-app-pub-9467977262277079/8176087967',
    ADMOB_REWARDED_AD_BONUS: 'ca-app-pub-9467977262277079/1653117039',
    ADMOB_REWARDED_SECOND_CHANCE: 'ca-app-pub-9467977262277079/7415424650',
    ADMOB_INTERSTITIAL_CHECKIN: 'ca-app-pub-9467977262277079/9808733833',
    ADMOB_INTERSTITIAL_QUIZ: 'ca-app-pub-9467977262277079/5677917131',
    ADMOB_INTERSTITIAL_REDEEM_DAILY: 'ca-app-pub-9467977262277079/2196042512',
  };

  for (const [k, v] of Object.entries(expected)) {
    checks[`local_${k}`] = prop(local, k) === v;
    checks[`tools_${k}`] = prop(tools, k) === v;
    if (releaseBc) {
      const re = new RegExp(
        `String ${k} = "${v.replace(/\//g, '\\/')}";`,
      );
      checks[`release_bc_${k}`] = re.test(releaseBc);
    }
  }
  checks.release_bc_present = !!releaseBc;

  const allUnits = Object.values(expected);
  checks.all_8_units_distinct = new Set(allUnits).size === 8;
  checks.no_old_shared_rewarded = !local.includes('6412729599');
  checks.no_old_shared_interstitial = !local.includes('9059074237');

  // Pro unlock: all 3 products use same PREMIUM rewarded slot + gates
  checks.pro_best_dialog =
    /PremiumUnlockTarget\.BEST_PREMIUM -> PremiumBestUnlockDialog/.test(
      premium,
    ) && /onWatchAd = \{ unlockWithAd\(target\) \}/.test(premium);
  checks.pro_max_dialog =
    /PremiumUnlockTarget\.PREMIUM_PRO_MAX -> PremiumBestUnlockDialog/.test(
      premium,
    );
  checks.pro_one_tap_dialog =
    /PremiumUnlockTarget\.ONE_TAP_PREMIUM -> PremiumBestUnlockDialog/.test(
      premium,
    );
  checks.pro_all_show_ad_flag =
    (premium.match(/showAdUnlock = /g) || []).length >= 1 &&
    (premium.match(/showAdUnlock/g) || []).length >= 3;
  checks.pro_all_show_coin_flag =
    (premium.match(/showCoinUnlock = unlockPrices\.coinUnlockEnabled/g) || [])
      .length >= 3;
  checks.pro_unlockWithAd_gated =
    /fun unlockWithAd\([\s\S]*?if \(!showAdUnlock\)/.test(premium);
  checks.pro_unlockWithAd_premium_slot =
    /fun unlockWithAd\([\s\S]*?slot = CalculateRewardedAds\.Slot\.PREMIUM/.test(
      premium,
    );
  checks.pro_preload_premium_gated =
    /LaunchedEffect\(showAdUnlock\)[\s\S]*?if \(showAdUnlock\)[\s\S]*?Slot\.PREMIUM/.test(
      premium,
    );
  checks.pro_dialog_preload_gated =
    /fun openUnlock\([\s\S]*?if \(showAdUnlock\)[\s\S]*?Slot\.PREMIUM/.test(
      premium,
    );
  checks.pro_on_rewarded_starts_flow =
    /onRewarded = \{[\s\S]*?startUnlockedFlow\(target\)/.test(premium);
  checks.pro_card_routes =
    /"best_premium" -> openUnlock\(PremiumUnlockTarget\.BEST_PREMIUM\)/.test(
      premium,
    ) &&
    /"premium_pro" -> openUnlock\(PremiumUnlockTarget\.PREMIUM_PRO_MAX\)/.test(
      premium,
    ) &&
    /"one_tap_premium" -> openUnlock\(PremiumUnlockTarget\.ONE_TAP_PREMIUM\)/.test(
      premium,
    );

  // Facade maps PREMIUM → dedicated unit
  checks.facade_premium_unit =
    /Slot\.PREMIUM\s*->\s*BuildConfig\.ADMOB_REWARDED_PREMIUM/.test(facade);
  checks.facade_all_slots_mapped =
    /Slot\.CALCULATE\s*->/.test(facade) &&
    /Slot\.DPI\s*->/.test(facade) &&
    /Slot\.PREMIUM\s*->/.test(facade) &&
    /Slot\.AD_BONUS\s*->/.test(facade) &&
    /Slot\.SECOND_CHANCE\s*->/.test(facade);

  // Interstitial loaders still correct fields
  checks.loader_checkin =
    /BuildConfig\.ADMOB_INTERSTITIAL_CHECKIN/.test(checkIn);
  checks.loader_quiz = /BuildConfig\.ADMOB_INTERSTITIAL_QUIZ/.test(quiz);
  checks.loader_redeem =
    /BuildConfig\.ADMOB_INTERSTITIAL_REDEEM_DAILY/.test(redeem);

  detail.premiumUnit = expected.ADMOB_REWARDED_PREMIUM;
  detail.proProducts = ['BEST_PREMIUM', 'PREMIUM_PRO_MAX', 'ONE_TAP_PREMIUM'];
  detail.sharedPremiumSlot =
    'All 3 pro unlocks share Slot.PREMIUM + ADMOB_REWARDED_PREMIUM (intentional)';

  notes.push(
    'Best Premium / Pro Max / One Tap all use one rewarded PREMIUM unit — correct for shared unlock screen.',
  );

  const failed = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  const ok = failed.length === 0;
  console.log(
    JSON.stringify(
      {
        ok,
        failed,
        counts: {
          total: Object.keys(checks).length,
          passed: Object.keys(checks).length - failed.length,
          failed: failed.length,
        },
        checks,
        detail,
        notes,
      },
      null,
      2,
    ),
  );
  console.log(ok ? 'PRO_ADS_FULL_OK' : 'PRO_ADS_FULL_FAIL');
  process.exit(ok ? 0 : 1);
}

main();
