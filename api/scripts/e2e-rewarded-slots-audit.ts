/**
 * Static accuracy audit: rewarded per-slot preload (Fix 1).
 * No AdMob device needed — verifies wire + isolation invariants in source.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '../..');

function read(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function main() {
  const checks: Record<string, boolean> = {};
  const detail: Record<string, unknown> = {};

  const facade = read(
    'app/src/main/java/com/ffsensitivity/app/ads/CalculateRewardedAds.kt',
  );
  const slot = read(
    'app/src/main/java/com/ffsensitivity/app/ads/RewardedAdSlot.kt',
  );
  const app = read(
    'app/src/main/java/com/ffsensitivity/app/FFSensitivityApp.kt',
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
  const bonus = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/DailyChallengeAdBonusGate.kt',
  );
  const second = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/DailyChallengeSecondChanceGate.kt',
  );

  const enumSlots = [
    'CALCULATE',
    'DPI',
    'PREMIUM',
    'AD_BONUS',
    'SECOND_CHANCE',
  ];
  checks.facade_has_all_slots = enumSlots.every((s) =>
    new RegExp(`\\b${s}\\b`).test(facade),
  );
  checks.facade_preload_requires_slot =
    /fun preload\(context: Context, slot: Slot\)/.test(facade);
  checks.facade_show_requires_slot =
    /fun show\(\s*activity: Activity,\s*slot: Slot,/s.test(facade);
  checks.facade_lazy_map = /Slot\.entries\.associateWith/.test(facade);
  checks.facade_global_showing = /globalShowing/.test(facade);
  checks.app_init_only =
    /CalculateRewardedAds\.initialize\(this\)/.test(app) &&
    !/CalculateRewardedAds\.preload\(/.test(app);

  // No legacy no-slot API left at call sites
  const callFiles = [premium, wizard, dpi, today, bonus, second];
  const legacyPreload = callFiles.some((f) =>
    /CalculateRewardedAds\.preload\(\s*context\s*\)/.test(f),
  );
  const legacyShow = callFiles.some(
    (f) =>
      /CalculateRewardedAds\.show\(/.test(f) &&
      !/slot\s*=\s*CalculateRewardedAds\.Slot\./.test(f),
  );
  checks.no_legacy_preload = !legacyPreload;
  checks.no_legacy_show_without_slot = !legacyShow;

  // Pairing: each slot has preload + show
  checks.premium_pair =
    /Slot\.PREMIUM/.test(premium) &&
    /preload\(context, CalculateRewardedAds\.Slot\.PREMIUM\)/.test(premium) &&
    /slot = CalculateRewardedAds\.Slot\.PREMIUM/.test(premium);
  checks.calculate_pair =
    /preload\(context, CalculateRewardedAds\.Slot\.CALCULATE\)/.test(wizard) &&
    /slot = CalculateRewardedAds\.Slot\.CALCULATE/.test(wizard);
  checks.dpi_pair =
    /preload\(context, CalculateRewardedAds\.Slot\.DPI\)/.test(dpi) &&
    /slot = CalculateRewardedAds\.Slot\.DPI/.test(dpi);
  checks.ad_bonus_pair =
    /Slot\.AD_BONUS/.test(today) &&
    /slot = CalculateRewardedAds\.Slot\.AD_BONUS/.test(bonus);
  checks.second_chance_pair =
    /Slot\.SECOND_CHANCE/.test(today) &&
    /slot = CalculateRewardedAds\.Slot\.SECOND_CHANCE/.test(second);

  // Slot isolation: own cached/loading/pending per instance
  checks.slot_own_cached = /private var cached: RewardedAd\?/.test(slot);
  checks.slot_own_loading = /private var loading = false/.test(slot);
  checks.slot_own_pending = /private var pendingShow: PendingShow\?/.test(slot);
  checks.slot_repreload_same =
    /fun finishOk\(\)[\s\S]*?preload\(activity\)/.test(slot) &&
    /fun finishFail\(message: String\)[\s\S]*?preload\(activity\)/.test(slot);

  // Global busy when another fullscreen up
  checks.global_blocks_show =
    /if \(showing \|\| isGlobalShowing\(\)\)/.test(slot);
  checks.global_set_on_present = /setGlobalShowing\(true\)/.test(slot);
  checks.global_clear_on_finish = /setGlobalShowing\(false\)/.test(slot);

  // Stuck-waiter when load completes under global show
  checks.blocked_pending_notified =
    /blocked\.onNotCompleted\(/.test(slot) &&
    /Another fullscreen is up/.test(slot);

  // Race: whenSdkReady must clear pendingShow if globalShowing (not bare return).
  const bareStuckReturn =
    /if \(showing \|\| isGlobalShowing\(\)\) return@whenSdkReady/.test(slot);
  const clearsPendingOnBusy =
    /if \(showing \|\| isGlobalShowing\(\)\) \{[\s\S]*?raceBlocked = pendingShow[\s\S]*?pendingShow = null/.test(
      slot,
    );
  checks.show_whenSdkReady_no_bare_busy_return = !bareStuckReturn;
  checks.show_whenSdkReady_clears_pending_if_busy = clearsPendingOnBusy;
  detail.showWhenSdkReadyStuckRisk = bareStuckReturn
    ? 'pendingShow can stick if globalShowing races after pending set'
    : clearsPendingOnBusy
      ? 'ok — clears pending + notifies'
      : 'missing clear path';

  // findActivity still public for screens
  checks.find_activity_exported = /fun Context\.findActivity\(\)/.test(facade);

  // Interstitials untouched (separate objects)
  const checkIn = read(
    'app/src/main/java/com/ffsensitivity/app/ads/CheckInInterstitialAds.kt',
  );
  const quiz = read(
    'app/src/main/java/com/ffsensitivity/app/ads/QuizInterstitialAds.kt',
  );
  const redeem = read(
    'app/src/main/java/com/ffsensitivity/app/ads/RedeemDailyInterstitialAds.kt',
  );
  checks.interstitial_checkin_intact =
    /object CheckInInterstitialAds/.test(checkIn) &&
    /fun preload\(context: Context\)/.test(checkIn);
  checks.interstitial_quiz_intact =
    /object QuizInterstitialAds/.test(quiz) &&
    /fun preload\(context: Context\)/.test(quiz);
  checks.interstitial_redeem_intact =
    /object RedeemDailyInterstitialAds/.test(redeem) &&
    /fun preload\(context: Context\)/.test(redeem);

  const failed = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  const ok = failed.length === 0;
  console.log(JSON.stringify({ ok, checks, failed, detail }, null, 2));
  console.log(ok ? 'REWARDED_SLOTS_AUDIT_OK' : 'REWARDED_SLOTS_AUDIT_FAIL');
  process.exit(ok ? 0 : 1);
}

main();
