/**
 * Static E2E: block saving app-suggestion copy on Compare with Free Fire.
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

  const screen = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/CompareSensitivityScreen.kt',
  );
  const service = read('api/src/compare/compare.service.ts');
  const components = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/CompareSensitivityComponents.kt',
  );

  // Fill cheat path removed
  checks.no_fill_app_values_button = !/Fill app values/.test(screen);
  checks.no_fillAppValuesSafe = !/fun fillAppValuesSafe/.test(screen);
  checks.clear_fields_kept =
    /label = "Clear fields"/.test(screen) && /fun clearFieldsSafe/.test(screen);

  // Client compare gate
  checks.compare_blocks_same =
    /fun compareSafe\([\s\S]*?if \(parsed == suggested\) \{[\s\S]*?COMPARE_SAME_AS_APP/.test(
      screen,
    );
  checks.compare_clears_compared_on_same =
    /if \(parsed == suggested\) \{[\s\S]*?compared = null/.test(screen);

  // Client save gate
  checks.save_blocks_same =
    /fun saveSafe\([\s\S]*?if \(actual == suggested\) \{[\s\S]*?COMPARE_SAME_AS_APP/.test(
      screen,
    );
  checks.save_same_does_not_launch_io =
    /if \(actual == suggested\) \{[\s\S]*?return\s*\n\s*\}\s*\n\s*clearError\(\)\s*\n\s*busy = true\s*\n\s*scope\.launch/.test(
      screen,
    );

  // Server gate
  checks.server_same_check =
    /if \(sameSensitivity\(dto\.suggested, dto\.actual\)\)/.test(service);
  checks.server_error_code = /COMPARE_SAME_AS_APP/.test(service);
  checks.server_error_message =
    /Enter your Free Fire sensitivity — not the same numbers as the app suggestion\./.test(
      service,
    );
  checks.server_sameSensitivity_all_fields =
    /function sameSensitivity\([\s\S]*?a\.general === b\.general[\s\S]*?a\.redDot === b\.redDot[\s\S]*?a\.scope2x === b\.scope2x[\s\S]*?a\.scope4x === b\.scope4x[\s\S]*?a\.sniper === b\.sniper[\s\S]*?a\.freeLook === b\.freeLook[\s\S]*?a\.fireButton === b\.fireButton/.test(
      service,
    );
  // Must run before create
  checks.server_check_before_create =
    service.indexOf('sameSensitivity(dto.suggested, dto.actual)') <
    service.indexOf('sensitivityCompare.create');

  // UX copy still points to Free Fire
  checks.intro_mentions_ff =
    /Open Free Fire → Settings → Sensitivity/.test(screen);

  // Dead fill helper not in components either
  checks.no_fill_elsewhere =
    !/Fill app values/.test(components) && !/fillAppValues/.test(components);

  notes.push(
    'Exact copy of all 7 fields is blocked. Changing even 1 number still allows save (by design).',
  );
  notes.push('Server enforces COMPARE_SAME_AS_APP so a modified APK cannot bypass.');

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
  console.log(ok ? 'COMPARE_SAME_AS_APP_OK' : 'COMPARE_SAME_AS_APP_FAIL');
  process.exit(ok ? 0 : 1);
}

main();
