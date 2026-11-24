/**
 * Static audit: Fix 2 rewarded preload timing (no cold-start bulk).
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

  checks.no_cold_start_preload =
    /CalculateRewardedAds\.initialize\(this\)/.test(app) &&
    !/CalculateRewardedAds\.preload\(/.test(app);

  checks.premium_screen_warm =
    /LaunchedEffect\(unlockPrices\.adUnlockEnabled\)/.test(premium) &&
    /adUnlockEnabled\) \{\s*CalculateRewardedAds\.preload\(context, CalculateRewardedAds\.Slot\.PREMIUM\)/s.test(
      premium,
    );
  checks.premium_dialog_refresh =
    /if \(unlockPrices\.adUnlockEnabled\) \{\s*CalculateRewardedAds\.preload\(context, CalculateRewardedAds\.Slot\.PREMIUM\)/s.test(
      premium,
    );

  checks.wizard_earlier_step =
    /safeStep >= 2 && needsCalculateAd/.test(wizard) &&
    /Slot\.CALCULATE/.test(wizard);
  checks.wizard_not_only_last =
    !/safeStep == 3 && needsCalculateAd/.test(wizard);

  checks.dpi_during_scan =
    /LaunchedEffect\(needsDpiAd\)/.test(dpi) &&
    /if \(needsDpiAd\) \{\s*CalculateRewardedAds\.preload\(context, CalculateRewardedAds\.Slot\.DPI\)/s.test(
      dpi,
    );
  checks.dpi_not_only_after_info =
    !/info != null && needsDpiAd/.test(dpi);

  checks.ad_bonus_guarded =
    /AdBonusAdConfig\.enabled/.test(today) &&
    /Slot\.AD_BONUS/.test(today);
  checks.second_chance_guarded =
    /SecondChanceAdConfig\.enabled/.test(today) &&
    /SecondChanceAdStore\.needsAd/.test(today) &&
    /Slot\.SECOND_CHANCE/.test(today);

  detail.triggers = {
    premium: 'screen open if adUnlockEnabled + dialog open refresh',
    calculate: 'wizard step >= 2 when needsCalculateAd',
    dpi: 'needsDpiAd (during scan)',
    adBonus: 'adAvailable + enabled',
    secondChance: 'AWAITING_AD + enabled + needsAd',
  };

  const failed = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  const ok = failed.length === 0;
  console.log(JSON.stringify({ ok, checks, failed, detail }, null, 2));
  console.log(
    ok ? 'REWARDED_PRELOAD_TIMING_OK' : 'REWARDED_PRELOAD_TIMING_FAIL',
  );
  process.exit(ok ? 0 : 1);
}

main();
