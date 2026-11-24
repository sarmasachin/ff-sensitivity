/**
 * Master static audit: ads preload + cache + unit wiring + show/preload pairs.
 * No AdMob device fill guess.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '../..');

function read(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function prop(src: string, key: string): string | null {
  const m = src.match(new RegExp(`^${key}=(.+)$`, 'm'));
  return m?.[1]?.trim() ?? null;
}

function main() {
  const checks: Record<string, boolean> = {};
  const notes: string[] = [];

  const facade = read(
    'app/src/main/java/com/ffsensitivity/app/ads/CalculateRewardedAds.kt',
  );
  const slot = read(
    'app/src/main/java/com/ffsensitivity/app/ads/RewardedAdSlot.kt',
  );
  const app = read(
    'app/src/main/java/com/ffsensitivity/app/FFSensitivityApp.kt',
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
  const premium = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/PremiumSensiUnlockScreen.kt',
  );
  const wizard = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/WizardScreen.kt',
  );
  const dpi = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/DeviceFetchScreen.kt',
  );
  const today = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/DailyChallengeTodayTab.kt',
  );
  const adBonus = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/DailyChallengeAdBonusGate.kt',
  );
  const second = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/DailyChallengeSecondChanceGate.kt',
  );
  const checkGate = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/DailyChallengeCheckInAdGate.kt',
  );
  const quizSection = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/DailyChallengeTodayQuiz.kt',
  );
  const redeemScreen = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/RedeemScreen.kt',
  );
  const scratch = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/RedeemScreenScratch.kt',
  );
  const redeemGate = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/RedeemDailyAdGate.kt',
  );
  const local = read('local.properties');
  const gradle = read('app/build.gradle.kts');

  // ----- Cold start -----
  checks.cold_sdk_init_only =
    /CalculateRewardedAds\.initialize\(this\)/.test(app) &&
    !/CalculateRewardedAds\.preload\(/.test(app) &&
    !/InterstitialAds\.preload/.test(app);

  // ----- Rewarded: per-slot unit + own cache -----
  const rewardedUnits = [
    'ADMOB_REWARDED_CALCULATE',
    'ADMOB_REWARDED_DPI',
    'ADMOB_REWARDED_PREMIUM',
    'ADMOB_REWARDED_AD_BONUS',
    'ADMOB_REWARDED_SECOND_CHANCE',
  ];
  for (const field of rewardedUnits) {
    checks[`rewarded_field_${field}`] =
      facade.includes(`BuildConfig.${field}`) &&
      gradle.includes(`"${field}"`) &&
      !!prop(local, field);
  }
  const unitVals = rewardedUnits.map((f) => prop(local, f)!);
  checks.rewarded_units_distinct = new Set(unitVals).size === 5;
  checks.rewarded_unitIdFor =
    /unitIdFor\(slot\)/.test(facade) &&
    /unitId = unitIdFor\(slot\)/.test(facade);
  checks.rewarded_slot_own_cached =
    /private var cached: RewardedAd\? = null/.test(slot);
  checks.rewarded_preload_skips_if_ready =
    /if \(cached != null \|\| loading \|\| showing\) return/.test(slot);
  checks.rewarded_show_uses_cache_first =
    /val ready = cached[\s\S]*?cached = null[\s\S]*?present\(/.test(slot);
  checks.rewarded_pending_on_cold_show =
    /pendingShow = PendingShow[\s\S]*?startLoadLocked/.test(slot);
  checks.rewarded_race_clears_pending =
    /raceBlocked = pendingShow[\s\S]*?pendingShow = null/.test(slot) &&
    !/if \(showing \|\| isGlobalShowing\(\)\) return@whenSdkReady/.test(slot);
  checks.rewarded_global_guard =
    /isGlobalShowing\(\)/.test(slot) && /setGlobalShowing\(true\)/.test(slot);
  checks.rewarded_dismiss_repreload =
    /fun finishOk\(\)[\s\S]*?preload\(activity\)/.test(slot) &&
    /fun finishFail\([\s\S]*?preload\(activity\)/.test(slot);
  checks.rewarded_load_uses_slot_unit =
    /RewardedAd\.load\(\s*appCtx,\s*unitId,/.test(slot);

  // Preload ↔ show pairs (same slot)
  checks.pair_calculate =
    /preload\(context, CalculateRewardedAds\.Slot\.CALCULATE\)/.test(wizard) &&
    /slot = CalculateRewardedAds\.Slot\.CALCULATE/.test(wizard);
  checks.pair_dpi =
    /preload\(context, CalculateRewardedAds\.Slot\.DPI\)/.test(dpi) &&
    /slot = CalculateRewardedAds\.Slot\.DPI/.test(dpi);
  checks.pair_premium =
    /preload\(context, CalculateRewardedAds\.Slot\.PREMIUM\)/.test(premium) &&
    /slot = CalculateRewardedAds\.Slot\.PREMIUM/.test(premium);
  checks.pair_ad_bonus =
    /Slot\.AD_BONUS/.test(today) &&
    /slot = CalculateRewardedAds\.Slot\.AD_BONUS/.test(adBonus);
  checks.pair_second =
    /Slot\.SECOND_CHANCE/.test(today) &&
    /slot = CalculateRewardedAds\.Slot\.SECOND_CHANCE/.test(second);

  // Preload timing gates
  checks.timing_premium =
    /LaunchedEffect\(unlockPrices\.adUnlockEnabled\)[\s\S]*?if \(unlockPrices\.adUnlockEnabled\)[\s\S]*?Slot\.PREMIUM/.test(
      premium,
    );
  checks.timing_wizard =
    /safeStep >= 2 && needsCalculateAd/.test(wizard) &&
    !/safeStep == 3 && needsCalculateAd/.test(wizard);
  checks.timing_dpi =
    /LaunchedEffect\(needsDpiAd\)/.test(dpi) &&
    /if \(needsDpiAd\) \{\s*CalculateRewardedAds\.preload\(context, CalculateRewardedAds\.Slot\.DPI\)/s.test(
      dpi,
    ) &&
    !/info != null && needsDpiAd/.test(dpi);
  checks.timing_ad_bonus =
    /snapshot\.adAvailable &&\s*snapshot\.adBonusEnabled &&\s*AdBonusAdConfig\.enabled/s.test(
      today,
    );
  checks.timing_second =
    /quizPhase == QuizUiPhase\.AWAITING_AD &&\s*SecondChanceAdConfig\.enabled &&\s*SecondChanceAdStore\.needsAd\(context\)/s.test(
      today,
    );

  // No legacy unscoped preload
  const callFiles = [premium, wizard, dpi, today, adBonus, second];
  checks.no_legacy_preload_no_slot = !callFiles.some((f) =>
    /CalculateRewardedAds\.preload\(\s*context\s*\)/.test(f),
  );
  checks.no_legacy_show_no_slot = !callFiles.some((f) =>
    /CalculateRewardedAds\.show\(\s*activity\s*,/.test(f),
  );

  // ----- Interstitials -----
  for (const [name, src] of [
    ['checkin', checkIn],
    ['quiz', quiz],
    ['redeem', redeem],
  ] as const) {
    checks[`${name}_sdk_init`] =
      /fun preload\([\s\S]*?CalculateRewardedAds\.initialize/.test(src) &&
      /fun show\([\s\S]*?CalculateRewardedAds\.initialize/.test(src) &&
      /loadIntoCache\([\s\S]*?CalculateRewardedAds\.initialize/.test(src);
    checks[`${name}_own_cache`] =
      /private var cached: InterstitialAd\? = null/.test(src);
    checks[`${name}_preload_skip_ready`] =
      /if \(cached != null \|\| loading\) return/.test(src);
    checks[`${name}_honor_pending`] =
      /val pending = pendingShow[\s\S]*?if \(pending != null\)[\s\S]*?present\(/.test(
        src,
      ) && !/presentPending/.test(src);
    checks[`${name}_fail_clears_pending`] =
      /onAdFailedToLoad[\s\S]*?pendingShow = null[\s\S]*?onNotCompleted/.test(
        src,
      );
    checks[`${name}_dismiss_repreload`] =
      /onAdDismissedFullScreenContent[\s\S]*?preload\(activity\)/.test(src);
  }

  checks.interstitial_checkin_wire =
    /CheckInInterstitialAds\.preload\(context\)/.test(today) &&
    /CheckInAdConfig\.enabled/.test(today) &&
    /CheckInInterstitialAds\.show\(/.test(checkGate);
  checks.interstitial_quiz_wire =
    /QuizInterstitialAds\.preload\(context\)/.test(today) &&
    /QuizAdConfig\.enabled/.test(today) &&
    /QuizInterstitialAds\.show\(/.test(quizSection);
  checks.interstitial_quiz_rewarm =
    /LaunchedEffect\(selectedOption, snapshot\.quizPhase\)/.test(today) &&
    /selectedOption >= 0/.test(today);
  checks.interstitial_redeem_wire =
    /needsRedeemDailyAd/.test(redeemScreen) &&
    /preloadIfNeeded/.test(redeemScreen) &&
    /RedeemDailyInterstitialAds\.preload/.test(scratch) &&
    /RedeemDailyInterstitialAds\.show/.test(redeemGate);

  // Correct unit fields on loaders
  checks.interstitial_units_wired =
    /BuildConfig\.ADMOB_INTERSTITIAL_CHECKIN/.test(checkIn) &&
    /BuildConfig\.ADMOB_INTERSTITIAL_QUIZ/.test(quiz) &&
    /BuildConfig\.ADMOB_INTERSTITIAL_REDEEM_DAILY/.test(redeem);

  const iCheck = prop(local, 'ADMOB_INTERSTITIAL_CHECKIN');
  const iQuiz = prop(local, 'ADMOB_INTERSTITIAL_QUIZ');
  const iRedeem = prop(local, 'ADMOB_INTERSTITIAL_REDEEM_DAILY');
  checks.interstitial_local_present = !!iCheck && !!iQuiz && !!iRedeem;
  checks.interstitial_units_distinct =
    !!iCheck &&
    !!iQuiz &&
    !!iRedeem &&
    iCheck !== iQuiz &&
    iQuiz !== iRedeem &&
    iCheck !== iRedeem;

  // Cross-type: interstitial does not use rewarded globalShowing (observed fact)
  const interstitialJoin = checkIn + quiz + redeem;
  if (!/isGlobalShowing|globalShowing/.test(interstitialJoin)) {
    notes.push(
      'Interstitials do not share rewarded globalShowing guard (separate fullscreen stacks).',
    );
  }
  checks.note_recorded = true; // placeholder so notes always visible with ok

  const failed = Object.entries(checks)
    .filter(([k, v]) => k !== 'note_recorded' && !v)
    .map(([k]) => k);
  delete (checks as { note_recorded?: boolean }).note_recorded;
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
        notes,
      },
      null,
      2,
    ),
  );
  console.log(ok ? 'ADS_PRELOAD_CACHE_FULL_OK' : 'ADS_PRELOAD_CACHE_FULL_FAIL');
  process.exit(ok ? 0 : 1);
}

main();
