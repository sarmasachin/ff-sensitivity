/**
 * Fetch Device age math — Android 13 GSF/board-api over-age.
 * npx ts-node --transpile-only scripts/e2e-device-age.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const DAY = 86_400_000;
const MONTH = 30 * DAY;
const SHIPPING_WINDOW = 42 * MONTH;

function utcYmdMs(year: number, month: number, day: number) {
  return Date.UTC(year, month - 1, day, 12, 0, 0);
}

function firstApiToEpochMs(firstApi: number): number | null {
  if (firstApi <= 0) return null;
  const [year, month] =
    firstApi >= 36
      ? [2025, 6]
      : firstApi >= 35
        ? [2024, 9]
        : firstApi >= 34
          ? [2023, 10]
          : firstApi >= 33
            ? [2022, 8]
            : firstApi >= 32
              ? [2022, 3]
              : firstApi >= 31
                ? [2021, 10]
                : firstApi >= 30
                  ? [2020, 9]
                  : firstApi >= 28
                    ? [2018, 8]
                    : [2011, 1];
  return utcYmdMs(year, month, 15);
}

function pickBirthMs(
  apiEpochMs: number | null,
  buildMs: number[],
  nowMs: number,
): number | null {
  const minOk = utcYmdMs(2012, 1, 1);
  const sane = buildMs.filter((t) => t >= minOk && t < nowMs);
  const oldestBuild = sane.length ? Math.min(...sane) : null;
  if (apiEpochMs == null) return oldestBuild;
  if (oldestBuild == null) return apiEpochMs;
  if (oldestBuild < apiEpochMs - 90 * DAY) return apiEpochMs;
  if (oldestBuild > nowMs - 18 * MONTH && apiEpochMs < nowMs - 30 * MONTH) {
    return apiEpochMs;
  }
  if (oldestBuild <= apiEpochMs + SHIPPING_WINDOW) return oldestBuild;
  return apiEpochMs;
}

function yearsSince(birthMs: number, nowMs: number) {
  const years = (nowMs - birthMs) / (365.25 * 24 * 60 * 60 * 1000);
  return Math.round(years * 10) / 10;
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

function main() {
  const now = utcYmdMs(2026, 8, 23);
  const api13 = firstApiToEpochMs(33)!;
  const boardApi28 = firstApiToEpochMs(28)!;
  const gsf2019 = utcYmdMs(2019, 3, 1);
  const vendor2024 = utcYmdMs(2024, 3, 10);
  const ota2026 = utcYmdMs(2026, 1, 15);

  const oldMin = Math.min(api13, gsf2019, boardApi28, ota2026);
  yearsSince(oldMin, now) >= 6
    ? pass(
        'OLD min(GSF+board+api) over-ages Android 13 phones',
        `${yearsSince(oldMin, now)} yrs`,
      )
    : fail(
        'OLD min(GSF+board+api) over-ages Android 13 phones',
        `${yearsSince(oldMin, now)}`,
      );

  const lateSku = pickBirthMs(api13, [ota2026, vendor2024], now)!;
  const lateYrs = yearsSince(lateSku, now);
  lateYrs >= 2 && lateYrs <= 3
    ? pass('2024 Android 13 late SKU uses vendor 2024 (~2.5 yrs)', `${lateYrs} yrs`)
    : fail('2024 Android 13 late SKU uses vendor 2024 (~2.5 yrs)', `${lateYrs}`);

  const flagshipOta = pickBirthMs(api13, [ota2026, ota2026], now)!;
  Math.abs(flagshipOta - api13) < DAY
    ? pass('2022 Android 13 flagship with 2026 OTA stays on API epoch')
    : fail('2022 Android 13 flagship with 2026 OTA stays on API epoch');

  pickBirthMs(api13, [gsf2019], now) === api13
    ? pass('ancient GSF 2019 is ignored (clock/OEM APK date)')
    : fail('ancient GSF 2019 is ignored (clock/OEM APK date)');

  const reader = fs.readFileSync(
    path.join(
      __dirname,
      '../../app/src/main/java/com/ffsensitivity/app/data/DeviceAgeReader.kt',
    ),
    'utf8',
  );
  const fetcher = fs.readFileSync(
    path.join(
      __dirname,
      '../../app/src/main/java/com/ffsensitivity/app/data/DeviceInfoFetcher.kt',
    ),
    'utf8',
  );
  /readSystemPropertyInt\("ro\.board\.first_api_level"/.test(reader) ||
  /readSystemPropertyInt\("ro\.board\.first_api_level"/.test(fetcher)
    ? fail('does not use board first_api (SoC age)')
    : pass('does not use board first_api (SoC age)');
  /com\.google\.android\.gsf/.test(reader) || /com\.google\.android\.gsf/.test(fetcher)
    ? fail('does not use GSF firstInstallTime')
    : pass('does not use GSF firstInstallTime');
  /DeviceAgeReader\.read/.test(fetcher)
    ? pass('DeviceInfoFetcher uses DeviceAgeReader')
    : fail('DeviceInfoFetcher uses DeviceAgeReader');
  /ro\.product\.first_api_level/.test(reader)
    ? pass('uses product first_api_level only')
    : fail('uses product first_api_level only');

  /eighteenMonths/.test(
    fs.readFileSync(
      path.join(
        __dirname,
        '../../app/src/main/java/com/ffsensitivity/app/data/DeviceAgeMath.kt',
      ),
      'utf8',
    ),
  )
    ? pass('Kotlin pickBirthMs has OTA vs late-SKU heuristic')
    : fail('Kotlin pickBirthMs has OTA vs late-SKU heuristic');

  const fetchScreen = fs.readFileSync(
    path.join(
      __dirname,
      '../../app/src/main/java/com/ffsensitivity/app/presentation/screens/DeviceFetchScreen.kt',
    ),
    'utf8',
  );
  /InfoRow\("Device Age", device\.deviceAgeLabel\)/.test(fetchScreen)
    ? pass('Fetch Device page still shows Device Age')
    : fail('Fetch Device page still shows Device Age');

  const engine = fs.readFileSync(
    path.join(
      __dirname,
      '../../app/src/main/java/com/ffsensitivity/app/engine/SettingsEngine.kt',
    ),
    'utf8',
  );
  /deltaAge\(device\.deviceAgeYears\)/.test(engine)
    ? pass('sensitivity engine still reads deviceAgeYears')
    : fail('sensitivity engine still reads deviceAgeYears');

  const api15 = firstApiToEpochMs(35)!;
  const newPhoneBuild = utcYmdMs(2026, 7, 1);
  const newBirth = pickBirthMs(api15, [newPhoneBuild], now)!;
  yearsSince(newBirth, now) <= 0.3
    ? pass('new Android 15 phone is not over-aged', `${yearsSince(newBirth, now)} yrs`)
    : fail('new Android 15 phone is not over-aged', `${yearsSince(newBirth, now)}`);

  pickBirthMs(null, [], now) == null
    ? pass('no signals → Unknown age')
    : fail('no signals → Unknown age');

  const failed = checks.filter((c) => !c.ok);
  console.log(`\nSummary: ${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) {
    failed.forEach((f) => console.error(` - ${f.name}: ${f.detail ?? ''}`));
    process.exit(1);
  }
}

main();
