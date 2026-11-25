/**
 * Full accuracy audit: Fix 2 preload timing + Fix 1 slots still intact.
 * Source-only; no AdMob device fill guess.
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
  const slotFile = read(
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

  // ----- Fix 1 still intact -----
  const enumSlots = [
    'CALCULATE',
    'DPI',
    'PREMIUM',
    'AD_BONUS',
    'SECOND_CHANCE',
  ];
  checks.f1_all_slots = enumSlots.every((s) =>
    new RegExp(`\\b${s}\\b`).test(facade),
  );
  checks.f1_preload_requires_slot =
    /fun preload\(context: Context, slot: Slot\)/.test(facade);
  checks.f1_show_requires_slot =
    /fun show\(\s*activity: Activity,\s*slot: Slot,/s.test(facade);
  checks.f1_no_legacy_preload = ![
    premium,
    wizard,
    dpi,
    today,
    bonus,
    second,
  ].some((f) => /CalculateRewardedAds\.preload\(\s*context\s*\)/.test(f));
  checks.f1_pairs =
    /Slot\.PREMIUM/.test(premium) &&
    /Slot\.PREMIUM/.test(wizard) &&
    /Slot\.CALCULATE/.test(wizard) &&
    /slot = CalculateRewardedAds\.Slot\.DPI/.test(dpi) &&
    /slot = CalculateRewardedAds\.Slot\.AD_BONUS/.test(bonus) &&
    /slot = CalculateRewardedAds\.Slot\.SECOND_CHANCE/.test(second);
  checks.f1_race_clear =
    /raceBlocked = pendingShow/.test(slotFile) &&
    /pendingShow = null/.test(slotFile) &&
    !/if \(showing \|\| isGlobalShowing\(\)\) return@whenSdkReady/.test(
      slotFile,
    );

  // ----- Fix 2: no cold start -----
  checks.f2_no_cold_preload =
    /CalculateRewardedAds\.initialize\(this\)/.test(app) &&
    !/CalculateRewardedAds\.preload\(/.test(app);

  // Premium: screen warm + dialog refresh; both gated by showAdUnlock
  checks.f2_premium_screen_warm = /LaunchedEffect\(showAdUnlock\)/.test(premium);
  checks.f2_premium_screen_preload_gated =
    /LaunchedEffect\(showAdUnlock\)[\s\S]*?if \(showAdUnlock\)[\s\S]*?Slot\.PREMIUM/.test(
      premium,
    );
  checks.f2_premium_dialog_gated =
    /fun openUnlock[\s\S]*?if \(showAdUnlock\)[\s\S]*?Slot\.PREMIUM/.test(
      premium,
    );
  // Must not preload PREMIUM when ad unlock off on dialog open
  const openUnlock = premium.match(
    /fun openUnlock\([\s\S]*?\n    fun dismissUnlock/,
  )?.[0];
  checks.f2_premium_open_not_ungated =
    !!openUnlock &&
    !/openUnlock[\s\S]*?CalculateRewardedAds\.preload\(context, CalculateRewardedAds\.Slot\.PREMIUM\)\s*\n    \}/.test(
      openUnlock,
    ) &&
    /if \(showAdUnlock\)/.test(openUnlock ?? '');
  detail.premiumOpenUnlockSnippet = openUnlock?.slice(0, 400);

  // Wizard: earlier step, still needsCalculateAd
  checks.f2_wizard_step_ge_2 = /safeStep >= 2 && needsCalculateAd/.test(wizard);
  checks.f2_wizard_not_only_step3 = !/safeStep == 3 && needsCalculateAd/.test(
    wizard,
  );
  // Paid engines → PREMIUM; classic → CALCULATE
  checks.f2_wizard_uses_calculate_slot =
    /Slot\.CALCULATE/.test(wizard) && /Slot\.PREMIUM/.test(wizard);
  // needsCalculateAd still respects paid engine skip
  checks.f2_wizard_paid_skip =
    /isPaidSensitivityEngine\(\)/.test(wizard) &&
    /needsCalculateAd/.test(wizard);

  // DPI: during scan via needsDpiAd only
  checks.f2_dpi_launched_on_needs =
    /LaunchedEffect\(needsDpiAd\)/.test(dpi) &&
    /if \(needsDpiAd\) \{\s*CalculateRewardedAds\.preload\(context, CalculateRewardedAds\.Slot\.DPI\)/s.test(
      dpi,
    );
  checks.f2_dpi_not_gated_on_info = !/info != null && needsDpiAd/.test(dpi);
  checks.f2_dpi_needs_uses_store =
    /needsDpiAd = dpiAdPassTick\.let \{ isDpiFeature && DpiAdStore\.needsAd\(context\) \}/.test(
      dpi,
    );

  // Ad bonus / second chance guards + imports
  checks.f2_today_imports_second =
    /import com\.ffsensitivity\.app\.data\.SecondChanceAdConfig/.test(today) &&
    /import com\.ffsensitivity\.app\.data\.SecondChanceAdStore/.test(today);
  checks.f2_ad_bonus_enabled_guard =
    /snapshot\.adAvailable &&\s*snapshot\.adBonusEnabled &&\s*AdBonusAdConfig\.enabled/s.test(
      today,
    );
  checks.f2_second_awaiting_guards =
    /quizPhase == QuizUiPhase\.AWAITING_AD &&\s*SecondChanceAdConfig\.enabled &&\s*SecondChanceAdStore\.needsAd\(context\)/s.test(
      today,
    );

  // Show sites still match preload slots
  checks.f2_show_bonus_slot =
    /slot = CalculateRewardedAds\.Slot\.AD_BONUS/.test(bonus);
  checks.f2_show_second_slot =
    /slot = CalculateRewardedAds\.Slot\.SECOND_CHANCE/.test(second);
  checks.f2_show_premium_slot =
    /slot = CalculateRewardedAds\.Slot\.PREMIUM/.test(premium);
  checks.f2_show_calc_slot =
    /Slot\.CALCULATE/.test(wizard) && /Slot\.PREMIUM/.test(wizard);
  checks.f2_show_dpi_slot = /slot = CalculateRewardedAds\.Slot\.DPI/.test(dpi);

  // Slot re-preload after dismiss still same-slot (instance method)
  checks.f2_dismiss_repreload = /fun finishOk\(\)[\s\S]*?preload\(activity\)/.test(
    slotFile,
  );

  const failed = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  const ok = failed.length === 0;
  console.log(JSON.stringify({ ok, checks, failed, detail }, null, 2));
  console.log(ok ? 'REWARDED_FIX2_FULL_OK' : 'REWARDED_FIX2_FULL_FAIL');
  process.exit(ok ? 0 : 1);
}

main();
