/**
 * E2E static audit: Notifications inbox "Clear all".
 * No device guess — source wiring only.
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
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/PushInboxScreen.kt',
  );
  const repo = read(
    'app/src/main/java/com/ffsensitivity/app/data/remote/PushRepository.kt',
  );
  const stores = read(
    'app/src/main/java/com/ffsensitivity/app/data/remote/PushInboxSeenStore.kt',
  );
  const api = read(
    'app/src/main/java/com/ffsensitivity/app/data/remote/PushApi.kt',
  );
  const pushService = read('api/src/push/push.service.ts');
  const pushController = read('api/src/push/push.controller.ts');

  // UI
  checks.ui_has_clear_all_label = /text = "Clear all"/.test(screen);
  checks.ui_clear_calls_fn =
    /clickable\(enabled = !busy\) \{ clearAll\(\) \}/.test(screen);
  checks.ui_clear_only_when_list =
    /messages\.isEmpty\(\) -> \{[\s\S]*?PushInboxEmptyState[\s\S]*?else -> \{[\s\S]*?Clear all/.test(
      screen,
    );
  checks.ui_clearAll_guards =
    /fun clearAll\(\) \{\s*\n\s*if \(busy \|\| messages\.isEmpty\(\)\) return/.test(
      screen,
    );
  checks.ui_clearAll_uses_repo =
    /PushRepository\.clearInbox\(context\)/.test(screen);
  checks.ui_clearAll_empties_state =
    /onSuccess \{\s*\n\s*messages = emptyList\(\)/.test(screen);
  checks.ui_clearAll_error_path =
    /Couldn’t clear inbox/.test(screen) && /Sign-in required/.test(screen);
  checks.ui_busy_while_clear = /busy = true[\s\S]*?clearInbox[\s\S]*?busy = false/.test(
    screen,
  );

  // Repo
  checks.repo_clearInbox =
    /fun clearInbox\(context: Context\): Result<Unit>/.test(repo);
  checks.repo_clear_requires_auth =
    /userId\.isEmpty\(\) \|\| session\.accessToken\(\)\.isBlank\(\)/.test(repo);
  checks.repo_clear_persists_dismiss =
    /PushInboxDismissStore\.add\(context, userId, ids\)/.test(repo);
  checks.repo_clear_marks_seen =
    /PushInboxSeenStore\.add\(context, userId, ids\)/.test(repo);
  checks.repo_clear_empties_cache =
    /PushInboxCache\.set\(emptyList\(\)\)/.test(repo);
  checks.repo_clear_badge =
    /PushInboxBadge\.clear\(\)/.test(repo);
  checks.repo_refresh_filters =
    /val visible = filterDismissed\(context, list\)/.test(repo) &&
    /PushInboxCache\.set\(visible\)/.test(repo);
  checks.repo_filter_excludes_dismissed =
    /list\.filter \{ it\.id\.isBlank\(\) \|\| it\.id !in dismissed \}/.test(repo);
  // Only refreshInbox should populate cache from API (no unfiltered set)
  const cacheSets = repo.match(/PushInboxCache\.set\(/g) || [];
  checks.repo_cache_set_count_ok = cacheSets.length === 2; // visible + emptyList

  // Dismiss store
  checks.dismiss_store_exists = /object PushInboxDismissStore/.test(stores);
  checks.dismiss_prefs_separate =
    /ff_push_inbox_dismiss_v1/.test(stores) &&
    /ff_push_inbox_seen_v1/.test(stores);
  checks.dismiss_per_user = /ids_\$userId|ids_\$\{userId\}|"ids_\$userId"/.test(
    stores,
  ) || /fun keyFor\(userId: String\): String = "ids_\$userId"/.test(stores);
  checks.dismiss_has_add_ids =
    /object PushInboxDismissStore[\s\S]*?fun add\(/.test(stores) &&
    /object PushInboxDismissStore[\s\S]*?fun ids\(/.test(stores);

  // API: no server clear (local-only is intentional) + inbox still GET only
  checks.api_inbox_get_only =
    /@Get\('inbox'\)/.test(pushController) &&
    !/clearInbox|clear-all|delete.*inbox/i.test(pushController);
  checks.api_no_clear_endpoint =
    !/clearInbox|clearAll|dismissInbox/i.test(pushService);
  notes.push(
    'Clear all is local dismiss (API has no clear/delete inbox) — refresh filters dismissed ids.',
  );

  // Inbox messages always carry campaign id from API mapper
  checks.api_maps_id = /id: r\.id/.test(pushService) || /id: r\.id,/.test(pushService);
  checks.app_parses_id = /optString\("id"\)|getString\("id"\)|"id"/.test(api);

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
  console.log(ok ? 'PUSH_INBOX_CLEAR_ALL_OK' : 'PUSH_INBOX_CLEAR_ALL_FAIL');
  process.exit(ok ? 0 : 1);
}

main();
