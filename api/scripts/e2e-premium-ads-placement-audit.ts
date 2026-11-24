/**
 * Static E2E: ads.premium separate from calculate — admin + API + app wiring.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  DEFAULT_ADS_CONFIG,
  normalizeAdsConfig,
  assertAdsConfigForSave,
} from '../src/app-config/app-config-ads';

const ROOT = path.join(__dirname, '../..');

function read(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function main() {
  const checks: Record<string, boolean> = {};
  const notes: string[] = [];

  const apiAds = read('api/src/app-config/app-config-ads.ts');
  const dto = read('api/src/app-config/dto/ads-config.dto.ts');
  const adminData = read('admin/src/components/ads/ads-data.ts');
  const adminPage = read('admin/src/app/(ops)/ads/page.tsx');
  const appApi = read(
    'app/src/main/java/com/ffsensitivity/app/data/remote/AppConfigApi.kt',
  );
  const appRepo = read(
    'app/src/main/java/com/ffsensitivity/app/data/remote/AppConfigRepository.kt',
  );
  const premCfg = read(
    'app/src/main/java/com/ffsensitivity/app/data/PremiumAdConfig.kt',
  );
  const premStore = read(
    'app/src/main/java/com/ffsensitivity/app/data/PremiumAdStore.kt',
  );
  const wizard = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/WizardScreen.kt',
  );
  const unlock = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/PremiumSensiUnlockScreen.kt',
  );

  checks.api_bundle_has_premium = /premium: AdPlacementConfig/.test(apiAds);
  checks.api_default_premium =
    /premium: placement\(/.test(apiAds) &&
    DEFAULT_ADS_CONFIG.premium.cooldownMinutes === 1440;
  checks.api_normalize_premium = /premium: normalizePlacement\(root\.premium/.test(
    apiAds,
  );
  checks.api_assert_premium = /ADS_BAD_PREMIUM/.test(apiAds);
  checks.api_dto_premium = /premium!: AdPlacementDto/.test(dto);

  checks.admin_bundle_premium = /premium: AdPlacementConfig/.test(adminData);
  checks.admin_default_premium = /premium: placement\(/.test(adminData);
  checks.admin_page_form = /title="Premium Pro"/.test(adminPage);
  checks.admin_save_premium = /premium: trimPlacement\(/.test(adminPage);

  const e2eBody = read('api/scripts/e2e-ads-body.ts');
  checks.e2e_ads_body_has_premium =
    /premium: \{/.test(e2eBody) && /opts\?\.premium/.test(e2eBody);

  checks.app_remote_ads_premium = /val premium: AppRemoteAdPlacement/.test(appApi);
  checks.app_parse_premium = /optJSONObject\("premium"\)/.test(appApi);
  checks.app_defaults_premium =
    /premium = AppRemoteAdPlacement\(/.test(appApi);
  checks.app_apply_premium = /PremiumAdConfig\.apply\(/.test(appRepo);

  checks.cfg_exists = /object PremiumAdConfig/.test(premCfg);
  checks.store_exists =
    /object PremiumAdStore/.test(premStore) &&
    /fun needsAd\(/.test(premStore) &&
    /fun markRewarded\(/.test(premStore);

  checks.wizard_paid_uses_premium =
    /if \(paidEngine\) \{\s*PremiumAdStore\.needsAd/s.test(wizard);
  checks.wizard_paid_slot_premium =
    /if \(paidEngine\) \{\s*CalculateRewardedAds\.Slot\.PREMIUM/s.test(wizard);
  checks.wizard_classic_still_calculate =
    /CalculateAdStore\.needsAd\(context, featureId\)/.test(wizard) &&
    /Slot\.CALCULATE/.test(wizard);
  checks.wizard_not_blind_skip =
    !/if \(AppSession\.isPaidSensitivityEngine\(\)\) \{\s*false/s.test(wizard);

  checks.unlock_uses_premium_cfg =
    /PremiumAdConfig\.incompleteMessage/.test(unlock) &&
    /PremiumAdConfig\.enabled/.test(unlock);
  checks.unlock_marks_rewarded =
    (unlock.match(/PremiumAdStore\.markRewarded/g) || []).length >= 2;
  checks.unlock_no_calculate_copy = !/CalculateAdConfig/.test(unlock);

  // Runtime normalize: missing premium → default
  const legacy = normalizeAdsConfig({
    calculate: DEFAULT_ADS_CONFIG.calculate,
    dpi: DEFAULT_ADS_CONFIG.dpi,
    quiz: DEFAULT_ADS_CONFIG.quiz,
    secondChance: DEFAULT_ADS_CONFIG.secondChance,
    adBonus: DEFAULT_ADS_CONFIG.adBonus,
    checkIn: DEFAULT_ADS_CONFIG.checkIn,
    redeemDaily: DEFAULT_ADS_CONFIG.redeemDaily,
  });
  checks.normalize_fills_missing_premium =
    legacy.premium.cooldownMinutes === 1440 &&
    legacy.premium.enabled === true;

  const custom = normalizeAdsConfig({
    ...DEFAULT_ADS_CONFIG,
    premium: {
      enabled: true,
      cooldownMinutes: 0,
      cooldownHours: 0,
      incompleteMessage: 'Premium custom incomplete',
      buttonLabel: 'Premium custom button',
    },
    calculate: {
      ...DEFAULT_ADS_CONFIG.calculate,
      cooldownMinutes: 1440,
    },
  });
  checks.premium_independent_of_calculate =
    custom.premium.cooldownMinutes === 0 &&
    custom.calculate.cooldownMinutes === 1440;

  try {
    assertAdsConfigForSave(custom);
    checks.assert_accepts_premium = true;
  } catch {
    checks.assert_accepts_premium = false;
  }

  notes.push(
    'Nest must be restarted so public /api/v1/app/config returns ads.premium.',
  );
  notes.push(
    'Economy adUnlockEnabled still ANDed with ads.premium.enabled for unlock dialog.',
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
        notes,
      },
      null,
      2,
    ),
  );
  console.log(ok ? 'PREMIUM_ADS_PLACEMENT_OK' : 'PREMIUM_ADS_PLACEMENT_FAIL');
  process.exit(ok ? 0 : 1);
}

main();
