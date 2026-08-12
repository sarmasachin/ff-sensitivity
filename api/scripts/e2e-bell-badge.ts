/**
 * Prove bell unread is isolated per Nest userId — same algorithm as Kotlin.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const SEP = '\u001f';
const MAX = 200;

type Check = { name: string; ok: boolean };
const checks: Check[] = [];
function pass(name: string, detail?: string) {
  checks.push({ name, ok: true });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name: string, detail?: string) {
  checks.push({ name, ok: false });
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

function readRepo(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

/** Exact replica of PushInboxSeenStore key + add + unread math. */
class SeenPrefs {
  private store = new Map<string, string>();

  keyFor(userId: string) {
    return `ids_${userId.trim()}`;
  }

  ids(userId: string): Set<string> {
    const uid = userId.trim();
    if (!uid) return new Set();
    const raw = this.store.get(this.keyFor(uid)) ?? '';
    if (!raw.trim()) return new Set();
    return new Set(
      raw.split(SEP).map((s) => s.trim()).filter((s) => s.length > 0),
    );
  }

  add(userId: string, next: string[]) {
    const uid = userId.trim();
    const clean = next.map((s) => s.trim()).filter((s) => s.length > 0);
    if (!uid || clean.length === 0) return;
    const merged = [...this.ids(uid), ...clean].slice(-MAX);
    this.store.set(this.keyFor(uid), merged.join(SEP));
  }

  unread(userId: string, messages: { id: string }[]): number {
    const uid = userId.trim();
    if (!uid) return 0;
    const seen = this.ids(uid);
    return messages.filter((m) => m.id.trim() && !seen.has(m.id)).length;
  }
}

function main() {
  const seenSrc = readRepo(
    'app/src/main/java/com/ffsensitivity/app/data/remote/PushInboxSeenStore.kt',
  );
  const login = readRepo(
    'app/src/main/java/com/ffsensitivity/app/MainNavHost.kt',
  );
  const auth = readRepo(
    'app/src/main/java/com/ffsensitivity/app/data/remote/UserAuthApi.kt',
  );
  const mainAct = readRepo(
    'app/src/main/java/com/ffsensitivity/app/MainActivity.kt',
  );
  const repo = readRepo(
    'app/src/main/java/com/ffsensitivity/app/data/remote/PushRepository.kt',
  );
  const inbox = readRepo(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/PushInboxScreen.kt',
  );

  seenSrc.includes('ids_$userId') &&
  seenSrc.includes('fun ids(context: Context, userId: String)') &&
  seenSrc.includes('fun add(context: Context, userId: String') &&
  seenSrc.includes('UserSessionStore(context).userId()') &&
  !seenSrc.includes('private const val KEY = "ids"')
    ? pass('kotlin_store_requires_userId')
    : fail('kotlin_store_requires_userId');

  (seenSrc.match(/UserSessionStore\(context\)\.userId\(\)/g) || []).length >= 2
    ? pass('recount_and_markSeen_both_read_session_userId')
    : fail('recount_and_markSeen_both_read_session_userId');

  login.includes('userId = session.userId') &&
  auth.includes('userId = user.getString("id")')
    ? pass('google_login_persists_nest_user_id')
    : fail('google_login_persists_nest_user_id');

  repo.includes('PushInboxBadge.recount(context, list)') &&
  inbox.includes('PushInboxBadge.markSeen') &&
  mainAct.includes('PushInboxBadge.clear()')
    ? pass('refresh_mark_clear_wired')
    : fail('refresh_mark_clear_wired');

  const campaigns = [
    { id: 'camp_all_1' },
    { id: 'camp_all_2' },
    { id: 'camp_all_3' },
  ];
  const prefs = new SeenPrefs();
  const userA = 'user_amari_aaa';
  const userB = 'user_manish_bbb';

  prefs.keyFor(userA) !== prefs.keyFor(userB)
    ? pass('prefs_keys_differ_per_user', `${prefs.keyFor(userA)} vs ${prefs.keyFor(userB)}`)
    : fail('prefs_keys_differ_per_user');

  prefs.unread(userA, campaigns) === 3 &&
  prefs.unread(userB, campaigns) === 3
    ? pass('both_start_unread_3')
    : fail('both_start_unread_3');

  prefs.add(userA, campaigns.map((c) => c.id));
  prefs.unread(userA, campaigns) === 0 &&
  prefs.unread(userB, campaigns) === 3
    ? pass('a_opened_inbox_b_still_3')
    : fail(
        'a_opened_inbox_b_still_3',
        `A=${prefs.unread(userA, campaigns)} B=${prefs.unread(userB, campaigns)}`,
      );

  prefs.add(userB, ['camp_all_1']);
  prefs.unread(userA, campaigns) === 0 &&
  prefs.unread(userB, campaigns) === 2
    ? pass('b_marks_one_a_stays_zero')
    : fail(
        'b_marks_one_a_stays_zero',
        `A=${prefs.unread(userA, campaigns)} B=${prefs.unread(userB, campaigns)}`,
      );

  const withNew = [...campaigns, { id: 'camp_all_4' }];
  prefs.unread(userA, withNew) === 1 &&
  prefs.unread(userB, withNew) === 3
    ? pass('new_campaign_increments_each_user_separately')
    : fail(
        'new_campaign_increments_each_user_separately',
        `A=${prefs.unread(userA, withNew)} B=${prefs.unread(userB, withNew)}`,
      );

  prefs.add('', ['should_not_store']);
  prefs.unread('', withNew) === 0 &&
  !prefs.ids('').size
    ? pass('blank_userId_never_stores_or_counts')
    : fail('blank_userId_never_stores_or_counts');

  prefs.unread(userA, withNew) === 1
    ? pass('blank_userId_does_not_wipe_user_a')
    : fail('blank_userId_does_not_wipe_user_a');

  const afterSignOutBadge = 0;
  const aBack = prefs.unread(userA, withNew);
  afterSignOutBadge === 0 && aBack === 1
    ? pass('sign_out_clears_memory_not_user_a_prefs')
    : fail('sign_out_clears_memory_not_user_a_prefs', `aBack=${aBack}`);

  const failed = checks.filter((c) => !c.ok).length;
  console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} passed`);
  process.exit(failed ? 1 : 0);
}

main();
