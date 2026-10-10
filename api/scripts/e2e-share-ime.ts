/**
 * Share-card IME layout e2e — fields must sit above the keyboard.
 * npx ts-node --transpile-only scripts/e2e-share-ime.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '../..');
const APP = path.join(ROOT, 'app/src/main');

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];
function pass(name: string, detail?: string) {
  checks.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name: string, detail?: string) {
  checks.push({ name, ok: false, detail });
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

function read(rel: string) {
  return fs.readFileSync(path.join(APP, rel), 'utf8');
}

function count(src: string, re: RegExp) {
  return (src.match(re) || []).length;
}

function main() {
  const screen = read('java/com/ffsensitivity/app/presentation/screens/ShareSensitivityScreen.kt');
  const parts = read('java/com/ffsensitivity/app/presentation/screens/ShareSensitivityFormParts.kt');
  const community = read('java/com/ffsensitivity/app/presentation/screens/ShareCommunityTab.kt');
  const contact = read('java/com/ffsensitivity/app/presentation/screens/ContactScreen.kt');
  const comments = read('java/com/ffsensitivity/app/presentation/screens/RedeemCommentsScreen.kt');
  const manifest = read('AndroidManifest.xml');
  const activity = fs.readFileSync(
    path.join(APP, 'java/com/ffsensitivity/app/MainActivity.kt'),
    'utf8',
  );

  /enableEdgeToEdge\(/.test(activity)
    ? pass('MainActivity is edge-to-edge (IME must be padded in Compose)')
    : fail('MainActivity is edge-to-edge (IME must be padded in Compose)');

  /android:windowSoftInputMode="adjustResize"/.test(manifest)
    ? pass('manifest still adjustResize')
    : fail('manifest still adjustResize');

  /\.imePadding\(\)/.test(screen)
    ? pass('ShareSensitivityScreen applies imePadding')
    : fail('ShareSensitivityScreen applies imePadding');

  /fun Modifier\.shareBringAboveIme/.test(parts)
    ? pass('shareBringAboveIme helper exists')
    : fail('shareBringAboveIme helper exists');

  /BringIntoViewRequester/.test(parts) && /bringIntoView\(\)/.test(parts)
    ? pass('focused field requests bringIntoView when IME opens')
    : fail('focused field requests bringIntoView when IME opens');

  const shareFields = count(screen, /ShareField\(/g);
  shareFields >= 6
    ? pass('Share screen still has all form ShareFields', `n=${shareFields}`)
    : fail('Share screen still has all form ShareFields', `n=${shareFields}`);

  const fieldUsesBring = /\.shareBringAboveIme\(\)/.test(
    parts.slice(parts.indexOf('fun ShareField'), parts.indexOf('fun ChipRow')),
  );
  fieldUsesBring
    ? pass('ShareField uses shareBringAboveIme')
    : fail('ShareField uses shareBringAboveIme');

  const cellUsesBring = /\.shareBringAboveIme\(\)/.test(
    parts.slice(parts.indexOf('fun SensiCell'), parts.indexOf('fun SubmitProButton')),
  );
  cellUsesBring
    ? pass('SensiCell uses shareBringAboveIme')
    : fail('SensiCell uses shareBringAboveIme');

  const outlined = count(parts, /OutlinedTextField\(/g);
  const bringRefs = count(parts, /shareBringAboveIme\(\)/g);
  // helper def + ShareField + SensiCell
  outlined === 2 && bringRefs === 3
    ? pass('every Share OutlinedTextField is IME-aware', `fields=${outlined}`)
    : fail(
        'every Share OutlinedTextField is IME-aware',
        `OutlinedTextField=${outlined} shareBringAboveIme=${bringRefs}`,
      );

  /OutlinedTextField|TextField\(/.test(community)
    ? fail('Community tab has no text fields (IME not needed)')
    : pass('Community tab has no text fields (IME not needed)');

  /\.imePadding\(\)/.test(contact)
    ? pass('Contact imePadding not regressed')
    : fail('Contact imePadding not regressed');
  /\.imePadding\(\)/.test(comments)
    ? pass('Redeem comments imePadding not regressed')
    : fail('Redeem comments imePadding not regressed');

  /verticalScroll\(rememberScrollState\(\)\)/.test(screen)
    ? pass('Share form is still scrollable under the keyboard')
    : fail('Share form is still scrollable under the keyboard');

  const failed = checks.filter((c) => !c.ok);
  console.log(`\nSummary: ${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) {
    failed.forEach((f) => console.error(` - ${f.name}: ${f.detail ?? ''}`));
    process.exit(1);
  }
}

main();
