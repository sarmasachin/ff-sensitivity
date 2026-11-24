/**
 * Verify each rewarded Slot maps to its own BuildConfig / local.properties unit.
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
  const detail: Record<string, string | null> = {};

  const facade = read(
    'app/src/main/java/com/ffsensitivity/app/ads/CalculateRewardedAds.kt',
  );
  const gradle = read('app/build.gradle.kts');
  const local = read('local.properties');
  const toolsLocal = read('tools/admob-ids.local');
  const wizard = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/WizardScreen.kt',
  );
  const dpi = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/DeviceFetchScreen.kt',
  );
  const premium = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/PremiumSensiUnlockScreen.kt',
  );
  const adBonus = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/DailyChallengeAdBonusGate.kt',
  );
  const second = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/DailyChallengeSecondChanceGate.kt',
  );

  const expected: Record<string, string> = {
    ADMOB_REWARDED_CALCULATE: 'ca-app-pub-9467977262277079/7298120567',
    ADMOB_REWARDED_DPI: 'ca-app-pub-9467977262277079/8756426486',
    ADMOB_REWARDED_PREMIUM: 'ca-app-pub-9467977262277079/8176087967',
    ADMOB_REWARDED_AD_BONUS: 'ca-app-pub-9467977262277079/1653117039',
    ADMOB_REWARDED_SECOND_CHANCE: 'ca-app-pub-9467977262277079/7415424650',
  };

  const slotMap: Array<[string, string]> = [
    ['CALCULATE', 'ADMOB_REWARDED_CALCULATE'],
    ['DPI', 'ADMOB_REWARDED_DPI'],
    ['PREMIUM', 'ADMOB_REWARDED_PREMIUM'],
    ['AD_BONUS', 'ADMOB_REWARDED_AD_BONUS'],
    ['SECOND_CHANCE', 'ADMOB_REWARDED_SECOND_CHANCE'],
  ];

  for (const [slot, field] of slotMap) {
    checks[`facade_${slot}_uses_${field}`] = new RegExp(
      `Slot\\.${slot}\\s*->\\s*BuildConfig\\.${field}`,
    ).test(facade);
    checks[`gradle_declares_${field}`] = gradle.includes(`"${field}"`);
    const v = prop(local, field);
    detail[field] = v;
    checks[`local_${field}`] = v === expected[field];
    checks[`tools_${field}`] = prop(toolsLocal, field) === expected[field];
  }

  const units = Object.values(expected);
  checks.all_five_distinct = new Set(units).size === 5;
  checks.no_old_shared_unit =
    !local.includes('6412729599') && !toolsLocal.includes('6412729599');
  checks.facade_no_shared_single_unitId =
    !/private val unitId: String[\s\S]*?get\(\) = BuildConfig\.ADMOB_REWARDED_CALCULATE/.test(
      facade,
    ) && /unitIdFor\(slot\)/.test(facade) && /unitId = unitIdFor\(slot\)/.test(facade);

  // Debug still samples all five rewarded fields
  checks.debug_sets_all_rewarded =
    /buildConfigField\("String", "ADMOB_REWARDED_CALCULATE"/.test(gradle) &&
    /buildConfigField\("String", "ADMOB_REWARDED_DPI"/.test(gradle) &&
    /buildConfigField\("String", "ADMOB_REWARDED_PREMIUM"/.test(gradle) &&
    /buildConfigField\("String", "ADMOB_REWARDED_AD_BONUS"/.test(gradle) &&
    /buildConfigField\("String", "ADMOB_REWARDED_SECOND_CHANCE"/.test(gradle);

  // Call sites still use correct slots (unit comes from slot map)
  checks.call_wizard_calculate =
    /Slot\.CALCULATE/.test(wizard) && !/Slot\.DPI/.test(wizard);
  checks.call_dpi = /Slot\.DPI/.test(dpi);
  checks.call_premium = /Slot\.PREMIUM/.test(premium);
  checks.call_ad_bonus = /Slot\.AD_BONUS/.test(adBonus);
  checks.call_second = /Slot\.SECOND_CHANCE/.test(second);

  const failed = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  const ok = failed.length === 0;
  console.log(JSON.stringify({ ok, failed, checks, detail }, null, 2));
  console.log(ok ? 'REWARDED_PER_UNIT_OK' : 'REWARDED_PER_UNIT_FAIL');
  process.exit(ok ? 0 : 1);
}

main();
