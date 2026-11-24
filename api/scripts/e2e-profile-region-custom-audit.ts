/**
 * Static E2E: Profile region — list pick + custom text.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '../..');

function read(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function main() {
  const checks: Record<string, boolean> = {};
  const notes: string[] = [];

  const optionsTs = read('api/src/user-profile/user-profile.options.ts');
  const service = read('api/src/user-profile/user-profile.service.ts');
  const dto = read('api/src/user-profile/dto/update-profile.dto.ts');
  const screen = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/ProfileScreen.kt',
  );
  const form = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/ProfileForm.kt',
  );
  const dialogs = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/ProfileDialogs.kt',
  );
  const repo = read(
    'app/src/main/java/com/ffsensitivity/app/data/ProfileRepository.kt',
  );

  const apiRegions = [
    'India',
    'Brazil',
    'Middle East',
    'Singapore',
    'Indonesia',
    'North America',
    'Europe',
    'Latin America',
  ];
  checks.api_preset_regions = apiRegions.every((r) => optionsTs.includes(`'${r}'`));
  checks.api_cleanRegion =
    /export function cleanRegion\(raw: string\): string \| null/.test(optionsTs);
  checks.api_cleanRegion_allows_custom =
    /if \(value\.length > 40\) return null/.test(optionsTs) &&
    /return value;/.test(optionsTs);
  checks.api_cleanRegion_blocks_angle =
    /if \(\/\[<>\]\/\.test\(value\)\) return null/.test(optionsTs);
  checks.api_service_uses_cleanRegion =
    /cleanRegion\(dto\.region\)/.test(service) &&
    !/cleanChoice\(dto\.region, PROFILE_REGIONS\)/.test(service);
  checks.api_dto_maxlen_40 =
    /region!: string/.test(dto) &&
    /@MaxLength\(40\)[\s\S]*?region!: string/.test(dto);

  checks.app_regions_match = apiRegions.every((r) =>
    repo.includes(`"${r}"`),
  );
  checks.ui_uses_region_dialog = /ProfileRegionDialog\(/.test(screen);
  checks.ui_not_old_region_choice =
    !/ProfileChoiceDialog\("Region"/.test(screen);
  checks.dialog_has_list =
    /options\.forEach \{ option ->/.test(dialogs) &&
    /ProfileChoiceRow\("Not set"/.test(dialogs);
  checks.dialog_has_custom_field =
    /text = "Custom region"/.test(dialogs) ||
    /"Custom region"/.test(dialogs);
  checks.dialog_has_use_custom = /Use custom/.test(dialogs);
  checks.dialog_custom_maxlen = /custom = it\.take\(40\)/.test(dialogs);
  checks.dialog_custom_sanitize =
    /custom\.trim\(\)\.replace\(Regex\("\\\\s\+"\), " "\)/.test(dialogs) ||
    /next\.trim\(\)\.replace\(Regex\("\\\\s\+"\), " "\)/.test(dialogs) ||
    /replace\(Regex\("\\\\s\+"\)/.test(dialogs);
  checks.dialog_prefills_custom =
    /mutableStateOf\(if \(isPreset\) "" else selectedClean\)/.test(dialogs);

  checks.client_validation_allows_custom =
    !/Pick a region from the list/.test(form) &&
    /Region must be 1–40 characters\./.test(form);
  checks.role_still_list_only =
    /Pick a role from the list\./.test(form);

  notes.push(
    'Empty "Use custom" tap is ignored until valid text (no toast) — minor UX, not a save bug.',
  );
  notes.push('Nest must be restarted/deployed for cleanRegion to apply on API.');

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
  console.log(ok ? 'PROFILE_REGION_CUSTOM_OK' : 'PROFILE_REGION_CUSTOM_FAIL');
  process.exit(ok ? 0 : 1);
}

main();
