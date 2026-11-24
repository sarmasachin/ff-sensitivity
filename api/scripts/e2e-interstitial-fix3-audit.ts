/**
 * Fix 3 audit: interstitial preload paths + SDK init + pending honor.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '../..');

function read(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function main() {
  const checks: Record<string, boolean> = {};

  const checkIn = read(
    'app/src/main/java/com/ffsensitivity/app/ads/CheckInInterstitialAds.kt',
  );
  const quiz = read(
    'app/src/main/java/com/ffsensitivity/app/ads/QuizInterstitialAds.kt',
  );
  const redeem = read(
    'app/src/main/java/com/ffsensitivity/app/ads/RedeemDailyInterstitialAds.kt',
  );
  const today = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/DailyChallengeTodayTab.kt',
  );
  const redeemScreen = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/RedeemScreen.kt',
  );
  const scratch = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/RedeemScreenScratch.kt',
  );
  const checkGate = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/DailyChallengeCheckInAdGate.kt',
  );
  const quizSection = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/DailyChallengeTodayQuiz.kt',
  );
  const redeemGate = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/RedeemDailyAdGate.kt',
  );

  for (const [name, src] of [
    ['checkin', checkIn],
    ['quiz', quiz],
    ['redeem', redeem],
  ] as const) {
    checks[`${name}_sdk_init_preload`] =
      /fun preload\([\s\S]*?CalculateRewardedAds\.initialize/.test(src);
    checks[`${name}_sdk_init_load`] =
      /private fun loadIntoCache\([\s\S]*?CalculateRewardedAds\.initialize/.test(
        src,
      );
    checks[`${name}_sdk_init_show`] =
      /fun show\([\s\S]*?CalculateRewardedAds\.initialize/.test(src);
    // Always honor pendingShow on load (no presentPending=false trap)
    checks[`${name}_honors_pending`] =
      /val pending = pendingShow\s*\n\s*if \(pending != null\)/.test(src) &&
      !/presentPending/.test(src);
    checks[`${name}_has_preload`] = /fun preload\(context: Context\)/.test(src);
    checks[`${name}_has_show`] = /fun show\(/.test(src);
  }

  checks.checkin_preload_path =
    /CheckInAdConfig\.enabled/.test(today) &&
    /CheckInInterstitialAds\.preload\(context\)/.test(today) &&
    /CheckInInterstitialAds\.show\(/.test(checkGate);
  checks.quiz_preload_path =
    /QuizAdConfig\.enabled/.test(today) &&
    /QuizInterstitialAds\.preload\(context\)/.test(today) &&
    /QuizInterstitialAds\.show\(/.test(quizSection);
  checks.quiz_rewarm_on_select =
    /LaunchedEffect\(selectedOption, snapshot\.quizPhase\)/.test(today) &&
    /selectedOption >= 0/.test(today);
  checks.redeem_preload_path =
    /needsRedeemDailyAd/.test(redeemScreen) &&
    /preloadIfNeeded/.test(redeemScreen) &&
    /RedeemDailyInterstitialAds\.preload/.test(scratch) &&
    /RedeemDailyInterstitialAds\.show/.test(redeemGate);
  checks.redeem_effect_keys_needs =
    /LaunchedEffect\(selectedCadenceId, redeemDailyAdPassTick, needsRedeemDailyAd\)/.test(
      redeemScreen,
    );

  const failed = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  const ok = failed.length === 0;
  console.log(JSON.stringify({ ok, checks, failed }, null, 2));
  console.log(ok ? 'INTERSTITIAL_FIX3_OK' : 'INTERSTITIAL_FIX3_FAIL');
  process.exit(ok ? 0 : 1);
}

main();
