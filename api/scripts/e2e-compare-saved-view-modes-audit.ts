/**
 * Static E2E: Compare saved players — All in one + Per player view modes.
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
  const comps = read(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/CompareSensitivityComponents.kt',
  );

  checks.enum_both_modes =
    /enum class CompareSavedViewMode/.test(comps) &&
    /ALL_IN_ONE/.test(comps) &&
    /PER_PLAYER/.test(comps);

  checks.toggle_both_chips =
    /label = "All in one"/.test(comps) &&
    /label = "Per player"/.test(comps);

  checks.default_all_in_one =
    /mutableStateOf\(CompareSavedViewMode\.ALL_IN_ONE\)/.test(screen);

  checks.toggle_only_when_data =
    /if \(sharedEntries\.isEmpty\(\)\) \{[\s\S]*?No saved comparisons yet[\s\S]*?\} else \{[\s\S]*?CompareSavedViewModeToggle/.test(
      screen,
    );

  checks.take_50 =
    /val topEntries = sharedEntries\.take\(50\)/.test(screen);

  checks.wires_all_in_one =
    /CompareSavedViewMode\.ALL_IN_ONE ->\s*CompareSavedSensiTable\(entries = topEntries\)/.test(
      screen,
    );

  checks.wires_per_player =
    /CompareSavedViewMode\.PER_PLAYER ->\s*CompareSavedPerPlayerTables\(entries = topEntries\)/.test(
      screen,
    );

  checks.helper_text_both =
    /One table with every player/.test(screen) &&
    /Separate table for each player/.test(screen);

  checks.all_in_one_multi_rows =
    /entries\.forEachIndexed[\s\S]*?CompareSensiTableRow\(/.test(comps) &&
    /showPlayer = true/.test(comps);

  checks.per_player_one_table_each =
    /entries\.forEach \{ entry ->\s*CompareSavedSinglePlayerTable\(entry = entry\)/.test(
      comps,
    );

  checks.per_player_shows_name =
    /entry\.displayName\.trim\(\)\.ifBlank \{ "Player" \}/.test(comps);

  checks.per_player_same_sensi_cols =
    /CompareSensiColHeader\("G"\)/.test(comps) &&
    /CompareSensiColHeader\("RD"\)/.test(comps) &&
    /CompareSensiColHeader\("2x"\)/.test(comps) &&
    /CompareSensiColHeader\("4x"\)/.test(comps) &&
    /CompareSensiColHeader\("SN"\)/.test(comps) &&
    /CompareSensiColHeader\("FL"\)/.test(comps) &&
    /CompareSensiColHeader\("Fire"\)/.test(comps);

  checks.uses_actual_values =
    /val a = entry\.actual/.test(comps) &&
    /CompareSensiColCell\(a\.general\)/.test(comps) &&
    /CompareSensiColCell\(a\.fireButton\)/.test(comps);

  checks.empty_copy_kept =
    /No saved comparisons yet\. A save here shows up for every player\./.test(
      screen,
    );

  // Misses that are intentional / not bugs
  notes.push(
    'View mode is session-only (not persisted) — resets to All in one on leave.',
  );
  notes.push(
    'Both modes use the same latest-50 list; data source unchanged.',
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
  console.log(
    ok ? 'COMPARE_SAVED_VIEW_MODES_OK' : 'COMPARE_SAVED_VIEW_MODES_FAIL',
  );
  process.exit(ok ? 0 : 1);
}

main();
