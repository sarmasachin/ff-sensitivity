/**
 * Fetch Device storage math — Android 13 marketed-size snap.
 * npx ts-node --transpile-only scripts/e2e-device-storage.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const MARKET_GB = [8, 16, 32, 64, 128, 256, 512, 1024, 2048];
const MIN_VOLUME_BYTES = 2 * 1000 * 1000 * 1000;

function bytesToDecimalGb(bytes: number) {
  return Math.max(0, bytes) / 1e9;
}

function snapMarketTotalBytes(usableBytes: number) {
  if (usableBytes < MIN_VOLUME_BYTES) return Math.max(0, usableBytes);
  const usableGb = bytesToDecimalGb(usableBytes);
  for (const bucket of MARKET_GB) {
    const minGb = bucket * 0.8;
    if (usableGb <= bucket + 0.5 && usableGb >= minGb) {
      return bucket * 1_000_000_000;
    }
  }
  return usableBytes;
}

function formatGbLabel(bytes: number) {
  const gb = bytesToDecimalGb(bytes);
  if (gb >= 10) return `${Math.round(gb)} GB`;
  return `${gb.toFixed(1)} GB`;
}

function formatStorageLabel(totalBytes: number, freeBytes: number) {
  const total = snapMarketTotalBytes(totalBytes);
  const free = Math.max(0, freeBytes);
  return `${formatGbLabel(free)} free / ${formatGbLabel(total)}`;
}

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

function eq(name: string, got: unknown, want: unknown) {
  got === want ? pass(name, String(got)) : fail(name, `got=${got} want=${want}`);
}

function main() {
  const mathKt = fs.readFileSync(
    path.join(__dirname, '../../app/src/main/java/com/ffsensitivity/app/data/DeviceStorageMath.kt'),
    'utf8',
  );
  const readerKt = fs.readFileSync(
    path.join(
      __dirname,
      '../../app/src/main/java/com/ffsensitivity/app/data/DeviceNetworkStorageReader.kt',
    ),
    'utf8',
  );

  /fun snapMarketTotalBytes/.test(mathKt)
    ? pass('DeviceStorageMath snap exists')
    : fail('DeviceStorageMath snap exists');
  /getUuidForPath/.test(readerKt)
    ? pass('reader uses getUuidForPath (Android 13 volume UUID)')
    : fail('reader uses getUuidForPath (Android 13 volume UUID)');
  /UUID_DEFAULT/.test(readerKt)
    ? pass('reader still probes UUID_DEFAULT as a candidate')
    : fail('reader still probes UUID_DEFAULT as a candidate');
  /formatShortFileSize/.test(readerKt)
    ? fail('storage label no longer uses OEM Formatter (Android 13 locale/GiB drift)')
    : pass('storage label no longer uses OEM Formatter (Android 13 locale/GiB drift)');
  /maxByOrNull \{ it\.first \}/.test(readerKt)
    ? pass('picks largest sane volume (drops tiny wrong UUID)')
    : fail('picks largest sane volume (drops tiny wrong UUID)');

  eq(
    '110 GB usable snaps to 128 GB (typical Android 13 128GB phone)',
    snapMarketTotalBytes(110 * 1e9),
    128 * 1e9,
  );
  eq(
    '119 GB usable snaps to 128 GB',
    snapMarketTotalBytes(119 * 1e9),
    128 * 1e9,
  );
  eq(
    '54 GB usable snaps to 64 GB',
    snapMarketTotalBytes(54 * 1e9),
    64 * 1e9,
  );
  eq(
    '218 GB usable snaps to 256 GB',
    snapMarketTotalBytes(218 * 1e9),
    256 * 1e9,
  );
  eq('exact 128 GB stays 128', snapMarketTotalBytes(128 * 1e9), 128 * 1e9);
  eq(
    'tiny 1 GB volume is not snapped to 8 GB',
    snapMarketTotalBytes(1e9),
    1e9,
  );
  eq(
    'label 42 free / 110 usable → 128 total',
    formatStorageLabel(110 * 1e9, 42 * 1e9),
    '42 GB free / 128 GB',
  );

  const failed = checks.filter((c) => !c.ok);
  console.log(`\nSummary: ${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) {
    failed.forEach((f) => console.error(` - ${f.name}: ${f.detail ?? ''}`));
    process.exit(1);
  }
}

main();
