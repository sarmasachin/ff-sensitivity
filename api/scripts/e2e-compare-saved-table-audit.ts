/**
 * Static E2E: Compare with Free Fire — latest 50 users saved-sensi table.
 * No device fill guess.
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

  const service = read('api/src/compare/compare.service.ts');
  const screen = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/CompareSensitivityScreen.kt',
  );
  const components = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/CompareSensitivityComponents.kt',
  );
  const apiKt = read(
    'app/src/main/java/com/ffsensitivity/app/data/remote/CompareApi.kt',
  );
  const repo = read(
    'app/src/main/java/com/ffsensitivity/app/data/remote/CompareRepository.kt',
  );

  // API: exactly 50 unique users via DISTINCT ON
  checks.api_list_users_50 = /const LIST_USERS = 50/.test(service);
  checks.api_distinct_on_user =
    /DISTINCT ON \(sc\.user_id\)/.test(service) ||
    /DISTINCT ON \(sc\.user_id\)/.test(service);
  checks.api_order_latest_then_limit =
    /ORDER BY latest\.created_at DESC/.test(service) &&
    /LIMIT \$\{LIST_USERS\}/.test(service);
  checks.api_maps_actual_fields =
    /actual_general/.test(service) &&
    /actual_red_dot/.test(service) &&
    /actual_scope_2x/.test(service) &&
    /actual_scope_4x/.test(service) &&
    /actual_sniper/.test(service) &&
    /actual_free_look/.test(service) &&
    /actual_fire_button/.test(service);
  checks.api_joins_display_name = /INNER JOIN users u ON u\.id = sc\.user_id/.test(
    service,
  );
  checks.api_no_weak_scan_window = !/LIST_SCAN/.test(service);

  // App: table wired, cards gone
  checks.ui_uses_table = /CompareSavedSensiTable\(entries = sharedEntries\.take\(10\)\)/.test(
    screen,
  );
  checks.ui_no_saved_card =
    !/CompareSavedCard\(/.test(screen) && !/CompareSavedCard\(/.test(components);
  checks.ui_empty_state = /No saved comparisons yet/.test(screen);
  checks.ui_reload_on_save = /loadGeneration \+= 1/.test(screen);
  checks.ui_loads_list = /CompareRepository\.list\(/.test(screen);

  checks.table_header_cols =
    /CompareSensiColHeader\("G"\)/.test(components) &&
    /CompareSensiColHeader\("RD"\)/.test(components) &&
    /CompareSensiColHeader\("2x"\)/.test(components) &&
    /CompareSensiColHeader\("4x"\)/.test(components) &&
    /CompareSensiColHeader\("SN"\)/.test(components) &&
    /CompareSensiColHeader\("FL"\)/.test(components) &&
    /CompareSensiColHeader\("Fire"\)/.test(components);
  checks.table_uses_actual =
    /val a = entry\.actual/.test(components) &&
    /CompareSensiColCell\(a\.general\)/.test(components) &&
    /CompareSensiColCell\(a\.fireButton\)/.test(components);
  checks.table_horizontal_scroll =
    /horizontalScroll\(rememberScrollState\(\)\)/.test(components);
  checks.table_player_col = /text = "Player"/.test(components);

  // Client parse still reads actual + items
  checks.client_parses_actual =
    /val actual = values\(o\.optJSONObject\("actual"\)\)/.test(apiKt);
  checks.client_parses_items = /optJSONArray\("items"\)/.test(apiKt);
  checks.repo_list = /fun list\(context: Context, fingers: String, role: String\)/.test(
    repo,
  );

  notes.push(
    'API uses DISTINCT ON (user_id) so one spammer cannot fill the latest-50 table.',
  );
  notes.push(
    'Table shows actual (saved FF) values, not suggested app values.',
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
  console.log(ok ? 'COMPARE_SAVED_TABLE_OK' : 'COMPARE_SAVED_TABLE_FAIL');
  process.exit(ok ? 0 : 1);
}

main();
