/**
 * Static audit: no technical user-facing error copy in UI paths.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '../..');
const APP = path.join(
  ROOT,
  'app/src/main/java/com/ffsensitivity/app',
);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith('.kt')) out.push(p);
  }
  return out;
}

function main() {
  const checks: Record<string, boolean> = {};
  const hits: string[] = [];

  const banned = [
    /Restart the app/i,
    /\bAdMob\b/,
    /\(code\s+\d+\)/,
    /debug APK/i,
    /frozen by ops/i,
    /Invalid request id/i,
    /Unknown unlock/i,
    /\[debug\]/,
    /Reinstall the debug/i,
  ];

  // Allow-list: comments/logs/docs only files / patterns
  const allowPath = (p: string) => {
    const rel = p.replace(/\\/g, '/');
    if (rel.endsWith('ApiUserMessages.kt')) return true; // detector itself
    if (rel.includes('/util/AppLog')) return true;
    return false;
  };

  for (const file of walk(APP)) {
    if (allowPath(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // skip comments and AppLog lines
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
        continue;
      }
      if (/AppLog\./.test(line)) continue;
      // BuildConfig ADMOB_* IDs are not user-visible copy.
      if (/BuildConfig\.ADMOB_/.test(line)) continue;
      for (const re of banned) {
        if (re.test(line)) {
          hits.push(`${path.relative(ROOT, file)}:${i + 1}: ${trimmed.slice(0, 100)}`);
        }
      }
    }
  }

  checks.helper_exists = fs.existsSync(
    path.join(APP, 'data/remote/ApiUserMessages.kt'),
  );
  const auth = fs.readFileSync(
    path.join(APP, 'data/remote/ApiAuth.kt'),
    'utf8',
  );
  checks.normalize_uses_friendly = /friendlyApiMessage\(/.test(auth);
  const slot = fs.readFileSync(
    path.join(APP, 'ads/RewardedAdSlot.kt'),
    'utf8',
  );
  checks.rewarded_no_code_suffix = !/\(code \$code\)/.test(slot) &&
    !/Couldn’t show the ad \(code/.test(slot);
  checks.no_ui_banned_hits = hits.length === 0;

  const failed = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  const ok = failed.length === 0;
  console.log(
    JSON.stringify(
      { ok, failed, checks, bannedHits: hits.slice(0, 30) },
      null,
      2,
    ),
  );
  console.log(ok ? 'FRIENDLY_USER_ERRORS_OK' : 'FRIENDLY_USER_ERRORS_FAIL');
  process.exit(ok ? 0 : 1);
}

main();
