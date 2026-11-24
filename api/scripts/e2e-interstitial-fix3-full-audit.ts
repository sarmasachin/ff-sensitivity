/**
 * Full accuracy audit: Fix 3 interstitials (Check-in / Quiz / Redeem Daily).
 * Source + wiring only — no AdMob device fill guess.
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

function main() {
  const checks: Record<string, boolean> = {};
  const notes: string[] = [];

  const checkIn = read(
    'app/src/main/java/com/ffsensitivity/app/ads/CheckInInterstitialAds.kt',
  );
  const quiz = read(
    'app/src/main/java/com/ffsensitivity/app/ads/QuizInterstitialAds.kt',
  );
  const redeem = read(
    'app/src/main/java/com/ffsensitivity/app/ads/RedeemDailyInterstitialAds.kt',
  );
  const app = read(
    'app/src/main/java/com/ffsensitivity/app/FFSensitivityApp.kt',
  );
  const today = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/DailyChallengeTodayTab.kt',
  );
  const quizSection = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/DailyChallengeTodayQuiz.kt',
  );
  const checkGate = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/DailyChallengeCheckInAdGate.kt',
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
  const checkStore = read(
    'app/src/main/java/com/ffsensitivity/app/data/CheckInAdStore.kt',
  );
  const quizStore = read(
    'app/src/main/java/com/ffsensitivity/app/data/QuizAdStore.kt',
  );
  const redeemStore = read(
    'app/src/main/java/com/ffsensitivity/app/data/RedeemDailyAdStore.kt',
  );
  const checkCfg = read(
    'app/src/main/java/com/ffsensitivity/app/data/CheckInAdConfig.kt',
  );
  const quizCfg = read(
    'app/src/main/java/com/ffsensitivity/app/data/QuizAdConfig.kt',
  );
  const redeemCfg = read(
    'app/src/main/java/com/ffsensitivity/app/data/RedeemDailyAdConfig.kt',
  );
  const gradle = read('app/build.gradle.kts');
  const localProps = readIf('local.properties');

  const loaders: Array<[string, string, string]> = [
    ['checkin', checkIn, 'ADMOB_INTERSTITIAL_CHECKIN'],
    ['quiz', quiz, 'ADMOB_INTERSTITIAL_QUIZ'],
    ['redeem', redeem, 'ADMOB_INTERSTITIAL_REDEEM_DAILY'],
  ];

  for (const [name, src, unitField] of loaders) {
    // SDK init before any load/show
    checks[`${name}_sdk_init_preload`] =
      /fun preload\([\s\S]*?CalculateRewardedAds\.initialize/.test(src);
    checks[`${name}_sdk_init_load`] =
      /private fun loadIntoCache\([\s\S]*?CalculateRewardedAds\.initialize/.test(
        src,
      );
    checks[`${name}_sdk_init_show`] =
      /fun show\([\s\S]*?CalculateRewardedAds\.initialize/.test(src);

    // No presentPending trap — always honor pending on load
    checks[`${name}_no_presentPending`] = !/presentPending/.test(src);
    // Allow optional comment lines between if/pendingShow/present (Check-in has one).
    checks[`${name}_honors_pending_on_load`] =
      /override fun onAdLoaded\([\s\S]*?val pending = pendingShow[\s\S]*?if \(pending != null\) \{[\s\S]*?pendingShow = null[\s\S]*?present\(/.test(
        src,
      ) && !/presentPending/.test(src);

    // Fail path clears pending + notifies (no stuck busy)
    checks[`${name}_fail_clears_pending`] =
      /override fun onAdFailedToLoad\([\s\S]*?val pending = pendingShow\s*\n\s*pendingShow = null\s*\n\s*pending\?\.let/.test(
        src,
      );
    checks[`${name}_fail_notifies`] =
      /onAdFailedToLoad[\s\S]*?onNotCompleted\(/.test(src);

    // Show: cache → pending+wait → pending+load
    checks[`${name}_show_uses_cache`] =
      /val ready = cached\s*\n\s*if \(ready != null\) \{\s*\n\s*cached = null\s*\n\s*present\(/.test(
        src,
      );
    checks[`${name}_show_queues_if_loading`] =
      /if \(loading\) \{\s*\n\s*pendingShow = PendingShow/.test(src);
    checks[`${name}_show_loads_if_cold`] =
      /pendingShow = PendingShow[\s\S]*?loadIntoCache\(activity\.applicationContext\)/.test(
        src,
      );

    // Dismiss / fail-to-show re-preloads same loader
    checks[`${name}_dismiss_repreload`] =
      /onAdDismissedFullScreenContent\([\s\S]*?preload\(activity\)/.test(src);
    checks[`${name}_fail_show_repreload`] =
      /onAdFailedToShowFullScreenContent\([\s\S]*?preload\(activity\)/.test(
        src,
      );

    // Correct unit field
    checks[`${name}_unit_field`] = new RegExp(
      `BuildConfig\\.${unitField}`,
    ).test(src);
    checks[`${name}_has_preload`] = /fun preload\(context: Context\)/.test(src);
    checks[`${name}_has_show`] = /fun show\(/.test(src);

    // Own cache (not shared across loaders)
    checks[`${name}_own_cached`] =
      /private var cached: InterstitialAd\? = null/.test(src);
  }

  // Distinct BuildConfig fields declared (debug + default props)
  for (const field of [
    'ADMOB_INTERSTITIAL_CHECKIN',
    'ADMOB_INTERSTITIAL_QUIZ',
    'ADMOB_INTERSTITIAL_REDEEM_DAILY',
  ]) {
    checks[`gradle_declares_${field}`] =
      gradle.includes(`"${field}"`) || gradle.includes(`"String", "${field}"`);
  }

  // No cold-start interstitial download
  checks.no_cold_interstitial_preload =
    !/CheckInInterstitialAds\.preload/.test(app) &&
    !/QuizInterstitialAds\.preload/.test(app) &&
    !/RedeemDailyInterstitialAds\.preload/.test(app);
  checks.app_sdk_init_only =
    /CalculateRewardedAds\.initialize\(this\)/.test(app) &&
    !/CalculateRewardedAds\.preload\(/.test(app);

  // ----- Check-in wire -----
  checks.checkin_preload_gated =
    /LaunchedEffect\(snapshot\.checkedInToday, checkInAdPassTick\)/.test(
      today,
    ) &&
    /!snapshot\.checkedInToday/.test(today) &&
    /CheckInAdConfig\.enabled/.test(today) &&
    /CheckInAdStore\.needsAd\(context\)/.test(today) &&
    /CheckInInterstitialAds\.preload\(context\)/.test(today);
  checks.checkin_show_only_gate =
    /CheckInInterstitialAds\.show\(/.test(checkGate) &&
    !/CheckInInterstitialAds\.show\(/.test(today);
  checks.checkin_gate_mark_shown =
    /onCompleted[\s\S]*?CheckInAdStore\.markShown\(context\)/.test(checkGate);
  checks.checkin_gate_needs_skip =
    /if \(!CheckInAdStore\.needsAd\(context\)\) \{\s*\n\s*runClaimWithoutAd\(\)/.test(
      checkGate,
    );
  checks.checkin_store_respects_enabled =
    /if \(!CheckInAdConfig\.enabled\) return false/.test(checkStore);
  checks.checkin_cfg_minutes =
    /cooldownMinutes/.test(checkCfg) && /cooldownWindowMs/.test(checkCfg);

  // ----- Quiz wire -----
  checks.quiz_preload_gated =
    /LaunchedEffect\(snapshot\.quizPhase, quizAdPassTick\)/.test(today) &&
    /QuizAdConfig\.enabled/.test(today) &&
    /QuizAdStore\.needsAd\(context\)/.test(today) &&
    /QuizInterstitialAds\.preload\(context\)/.test(today);
  checks.quiz_rewarm_on_select =
    /LaunchedEffect\(selectedOption, snapshot\.quizPhase\)/.test(today) &&
    /selectedOption >= 0/.test(today) &&
    /QuizInterstitialAds\.preload\(context\)/.test(today);
  checks.quiz_show_in_section =
    /QuizInterstitialAds\.show\(/.test(quizSection);
  checks.quiz_show_not_in_today = !/QuizInterstitialAds\.show\(/.test(today);
  checks.quiz_needs_uses_store =
    /needsQuizAd = remember[\s\S]*?QuizAdStore\.needsAd\(context\)/.test(
      quizSection,
    );
  checks.quiz_gate_mark_shown =
    /onCompleted[\s\S]*?QuizAdStore\.markShown\(context\)/.test(quizSection);
  checks.quiz_store_respects_enabled =
    /if \(!QuizAdConfig\.enabled\) return false/.test(quizStore);
  checks.quiz_cfg_minutes =
    /cooldownMinutes/.test(quizCfg) && /cooldownWindowMs/.test(quizCfg);

  // ----- Redeem wire -----
  checks.redeem_needs_flag =
    /needsRedeemDailyAd = remember\(selectedCadenceId, isBusy, redeemDailyAdPassTick\)/.test(
      redeemScreen,
    ) &&
    /isDailyCadence && RedeemDailyAdStore\.needsAd\(context\)/.test(
      redeemScreen,
    );
  checks.redeem_effect_keys =
    /LaunchedEffect\(selectedCadenceId, redeemDailyAdPassTick, needsRedeemDailyAd\)/.test(
      redeemScreen,
    );
  checks.redeem_effect_calls_preload =
    /if \(needsRedeemDailyAd\) \{\s*\n\s*RedeemScreenScratch\.preloadIfNeeded\(context, isDailyCadence\)/.test(
      redeemScreen,
    );
  checks.redeem_preloadIfNeeded =
    /fun preloadIfNeeded\(context: Context, dailyTab: Boolean\) \{\s*\n\s*if \(dailyTab && RedeemDailyAdStore\.needsAd\(context\)\) \{\s*\n\s*RedeemDailyInterstitialAds\.preload\(context\)/.test(
      scratch,
    );
  checks.redeem_show_only_gate =
    /RedeemDailyInterstitialAds\.show\(/.test(redeemGate) &&
    !/RedeemDailyInterstitialAds\.show\(/.test(redeemScreen) &&
    !/RedeemDailyInterstitialAds\.show\(/.test(scratch);
  checks.redeem_gate_used_scratch =
    (scratch.match(/RedeemDailyAdGate\.run\(/g) || []).length >= 2;
  checks.redeem_gate_mark_shown =
    /onCompleted[\s\S]*?RedeemDailyAdStore\.markShown\(context\)/.test(
      redeemGate,
    );
  checks.redeem_gate_needs_skip =
    /if \(!RedeemDailyAdStore\.needsAd\(context\)\) \{\s*\n\s*onProceed\(\)/.test(
      redeemGate,
    );
  checks.redeem_store_respects_enabled =
    /if \(!RedeemDailyAdConfig\.enabled\) return false/.test(redeemStore);
  checks.redeem_cfg_minutes =
    /cooldownMinutes/.test(redeemCfg) && /cooldownWindowMs/.test(redeemCfg);

  // Show sites must not call wrong loaders
  checks.no_cross_show_checkin =
    !/QuizInterstitialAds\.show/.test(checkGate) &&
    !/RedeemDailyInterstitialAds\.show/.test(checkGate);
  checks.no_cross_show_quiz =
    !/CheckInInterstitialAds\.show/.test(quizSection) &&
    !/RedeemDailyInterstitialAds\.show/.test(quizSection);
  checks.no_cross_show_redeem =
    !/CheckInInterstitialAds\.show/.test(redeemGate) &&
    !/QuizInterstitialAds\.show/.test(redeemGate);

  // Per-placement interstitial units (split 2026-11-24)
  if (localProps) {
    const mCheck = localProps.match(
      /ADMOB_INTERSTITIAL_CHECKIN=(.+)/,
    )?.[1]?.trim();
    const mQuiz = localProps.match(/ADMOB_INTERSTITIAL_QUIZ=(.+)/)?.[1]?.trim();
    const mRedeem = localProps.match(
      /ADMOB_INTERSTITIAL_REDEEM_DAILY=(.+)/,
    )?.[1]?.trim();
    checks.local_props_has_all_three =
      !!mCheck && !!mQuiz && !!mRedeem;
    checks.local_props_units_distinct =
      !!mCheck &&
      !!mQuiz &&
      !!mRedeem &&
      mCheck !== mQuiz &&
      mQuiz !== mRedeem &&
      mCheck !== mRedeem;
    checks.local_checkin_unit =
      mCheck === 'ca-app-pub-9467977262277079/9808733833';
    checks.local_quiz_unit =
      mQuiz === 'ca-app-pub-9467977262277079/5677917131';
    checks.local_redeem_unit =
      mRedeem === 'ca-app-pub-9467977262277079/2196042512';
  } else {
    checks.local_props_has_all_three = false;
    checks.local_props_units_distinct = false;
    checks.local_checkin_unit = false;
    checks.local_quiz_unit = false;
    checks.local_redeem_unit = false;
    notes.push('local.properties missing');
  }

  // Stale comment only (not a runtime miss)
  if (/Hours from \[QuizAdConfig\]/.test(quizStore)) {
    notes.push(
      'QuizAdStore.kt comment still says Hours (cosmetic; cooldownMinutes code is correct)',
    );
  }

  const failed = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  const ok = failed.length === 0;
  console.log(
    JSON.stringify(
      {
        ok,
        failed,
        checks,
        notes,
        counts: {
          total: Object.keys(checks).length,
          passed: Object.keys(checks).length - failed.length,
          failed: failed.length,
        },
      },
      null,
      2,
    ),
  );
  console.log(ok ? 'INTERSTITIAL_FIX3_FULL_OK' : 'INTERSTITIAL_FIX3_FULL_FAIL');
  process.exit(ok ? 0 : 1);
}

main();
