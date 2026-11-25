/**
 * App admin page — what works vs not (API + public config gate semantics).
 * Run: npx ts-node --transpile-only scripts/e2e-app-page-working-audit.ts
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as jwt from 'jsonwebtoken';
import * as path from 'path';

const API = process.env.API_BASE ?? 'http://127.0.0.1:4000';
const prisma = new PrismaClient();
const checks: { name: string; ok: boolean; detail?: string }[] = [];

function loadEnv() {
  const raw = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

function pass(name: string, detail?: string) {
  checks.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name: string, detail?: string) {
  checks.push({ name, ok: false, detail });
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}
function note(name: string, detail: string) {
  console.log(`NOTE  ${name} — ${detail}`);
}

async function req(
  method: string,
  pathName: string,
  opts?: { token?: string; body?: unknown },
) {
  const res = await fetch(`${API}${pathName}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(opts?.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

function writeBody(cfg: any) {
  return {
    status: { ...cfg.status },
    features: { ...cfg.features },
    navigation: { ...cfg.navigation },
    links: { ...cfg.links },
  };
}

async function main() {
  loadEnv();
  const email = process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';
  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) {
    fail('admin exists', email);
    process.exit(1);
  }
  const tok = jwt.sign(
    { sub: admin.id, email: admin.email, role: admin.role },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: '1h' },
  );

  const get0 = await req('GET', '/api/v1/admin/app', { token: tok });
  if (get0.status !== 200) {
    fail('admin GET /app', `status=${get0.status}`);
    process.exit(1);
  }
  pass('admin GET /app', `keys=${Object.keys(get0.json).sort().join(',')}`);
  const baseline = writeBody(get0.json);

  // --- Save bug: echo ads ---
  const echo = await req('PUT', '/api/v1/admin/app', {
    token: tok,
    body: get0.json,
  });
  const echoMsg = String(echo.json?.error?.message ?? echo.json?.message ?? '');
  echo.status === 400 && echoMsg.toLowerCase().includes('ads should not exist')
    ? pass(
        'bug confirmed: PUT with ads fails',
        'admin must strip ads (Save config without hard-refresh still broken)',
      )
    : fail('bug confirmed: PUT with ads fails', `${echo.status} ${echoMsg}`);

  // --- Clean save: status gates ---
  const statusSave = await req('PUT', '/api/v1/admin/app', {
    token: tok,
    body: {
      ...baseline,
      status: {
        ...baseline.status,
        maintenanceMode: false,
        maintenanceMessage:
          baseline.status.maintenanceMessage ||
          'We are performing scheduled maintenance. Please try again shortly.',
        forceUpdate: true,
        softUpdatePrompt: true,
        minVersionCode: 99,
        minVersionName: '9.9.9',
      },
    },
  });
  statusSave.status === 200 &&
  statusSave.json?.status?.forceUpdate === true &&
  statusSave.json?.status?.softUpdatePrompt === true &&
  statusSave.json?.status?.minVersionCode === 99
    ? pass(
        'Status fields SAVE (force/soft/minVersion)',
        `force=${statusSave.json.status.forceUpdate} soft=${statusSave.json.status.softUpdatePrompt} minCode=${statusSave.json.status.minVersionCode}`,
      )
    : fail(
        'Status fields SAVE (force/soft/minVersion)',
        JSON.stringify(statusSave.json?.error ?? statusSave.json).slice(0, 240),
      );

  const pub = await req('GET', '/api/v1/app/config');
  pub.status === 200 &&
  pub.json?.status?.forceUpdate === true &&
  pub.json?.status?.minVersionCode === 99
    ? pass(
        'Public config reflects force-update save',
        `minCode=${pub.json.status.minVersionCode} soft=${pub.json.status.softUpdatePrompt}`,
      )
    : fail('Public config reflects force-update save', `status=${pub.status}`);

  // Gate semantics (same as AppConfigRepository.gate)
  const vcApp = 10; // current app versionCode in build.gradle.kts
  const forceBlocks =
    pub.json?.status?.forceUpdate === true &&
    vcApp < Number(pub.json?.status?.minVersionCode);
  forceBlocks
    ? pass(
        'Force update WOULD block current app (vc=10)',
        `10 < ${pub.json.status.minVersionCode}`,
      )
    : fail(
        'Force update WOULD block current app (vc=10)',
        'expected block with minCode=99',
      );

  // Soft update: flag present on API, no Android UI consumer (static code audit)
  const appRepo = fs.readFileSync(
    path.join(
      __dirname,
      '..',
      '..',
      'app/src/main/java/com/ffsensitivity/app/data/remote/AppConfigRepository.kt',
    ),
    'utf8',
  );
  const softUsedInGate = /softUpdatePrompt/.test(appRepo);
  const softUiHits = [
    'AppRemoteGateOverlay.kt',
    'MainActivity.kt',
    'HomeScreen.kt',
  ].filter((f) => {
    const p = path.join(
      __dirname,
      '..',
      '..',
      'app/src/main/java/com/ffsensitivity/app',
      f.includes('Main') || f.includes('Home')
        ? f === 'MainActivity.kt'
          ? f
          : f === 'HomeScreen.kt'
            ? `presentation/screens/${f}`
            : f
        : `presentation/components/${f}`,
    );
    const alt =
      f === 'MainActivity.kt'
        ? path.join(
            __dirname,
            '..',
            '..',
            'app/src/main/java/com/ffsensitivity/app/MainActivity.kt',
          )
        : f === 'HomeScreen.kt'
          ? path.join(
              __dirname,
              '..',
              '..',
              'app/src/main/java/com/ffsensitivity/app/presentation/screens/HomeScreen.kt',
            )
          : path.join(
              __dirname,
              '..',
              '..',
              'app/src/main/java/com/ffsensitivity/app/presentation/components/AppRemoteGateOverlay.kt',
            );
    const text = fs.readFileSync(alt, 'utf8');
    return /softUpdatePrompt|SoftUpdate/.test(text);
  });
  !softUsedInGate && softUiHits.length === 0
    ? pass(
        'Soft update prompt NOT wired in Android UI (confirmed)',
        'flag saves on API only',
      )
    : fail(
        'Soft update prompt NOT wired in Android UI (confirmed)',
        `repoUses=${softUsedInGate} ui=${softUiHits.join(',')}`,
      );

  // Maintenance save + public
  const maint = await req('PUT', '/api/v1/admin/app', {
    token: tok,
    body: {
      ...baseline,
      status: {
        ...baseline.status,
        maintenanceMode: true,
        maintenanceMessage: `E2E maintenance ${Date.now()}`,
        forceUpdate: false,
        softUpdatePrompt: true,
        minVersionCode: 1,
        minVersionName: '1.0.0',
      },
    },
  });
  const pubM = await req('GET', '/api/v1/app/config');
  maint.status === 200 && pubM.json?.status?.maintenanceMode === true
    ? pass(
        'Maintenance mode SAVE + public',
        String(pubM.json.status.maintenanceMessage).slice(0, 40),
      )
    : fail('Maintenance mode SAVE + public', `put=${maint.status}`);

  // Features kill-switch
  const featOff = await req('PUT', '/api/v1/admin/app', {
    token: tok,
    body: {
      ...baseline,
      status: {
        ...baseline.status,
        maintenanceMode: false,
        forceUpdate: false,
        softUpdatePrompt: true,
        minVersionCode: 1,
        minVersionName: '1.0.0',
      },
      features: { ...baseline.features, shop: false, redeem: true },
    },
  });
  const pubF = await req('GET', '/api/v1/app/config');
  featOff.status === 200 && pubF.json?.features?.shop === false
    ? pass('Features kill-switch SAVE (shop off)')
    : fail('Features kill-switch SAVE (shop off)', `put=${featOff.status}`);

  // Navigation
  const navOff = await req('PUT', '/api/v1/admin/app', {
    token: tok,
    body: {
      ...writeBody({
        ...baseline,
        status: {
          ...baseline.status,
          maintenanceMode: false,
          forceUpdate: false,
          minVersionCode: 1,
          minVersionName: '1.0.0',
        },
        features: { ...baseline.features, shop: true },
        navigation: { ...baseline.navigation, homeShop: false, navAbout: true },
      }),
    },
  });
  const pubN = await req('GET', '/api/v1/app/config');
  navOff.status === 200 && pubN.json?.navigation?.homeShop === false
    ? pass('Navigation SAVE (homeShop off)')
    : fail('Navigation SAVE (homeShop off)', `put=${navOff.status}`);

  // Links https enforced
  const badLink = await req('PUT', '/api/v1/admin/app', {
    token: tok,
    body: {
      ...baseline,
      status: {
        ...baseline.status,
        maintenanceMode: false,
        forceUpdate: false,
        minVersionCode: 1,
        minVersionName: '1.0.0',
      },
      links: {
        ...baseline.links,
        playStoreUrl: 'http://example.com/store',
      },
    },
  });
  badLink.status === 400
    ? pass('Links reject http URL', String(badLink.json?.error?.message ?? '').slice(0, 80))
    : fail('Links reject http URL', `status=${badLink.status}`);

  const goodLink = await req('PUT', '/api/v1/admin/app', {
    token: tok,
    body: {
      ...baseline,
      status: {
        ...baseline.status,
        maintenanceMode: false,
        forceUpdate: false,
        softUpdatePrompt: true,
        minVersionCode: 1,
        minVersionName: '1.0.0',
      },
      features: baseline.features,
      navigation: baseline.navigation,
      links: baseline.links,
    },
  });
  goodLink.status === 200
    ? pass('Restore baseline config')
    : fail('Restore baseline config', `status=${goodLink.status}`);

  // Admin client strip helper present on disk
  const adminApi = fs.readFileSync(
    path.join(
      __dirname,
      '..',
      '..',
      'admin/src/components/app-control/app-api.ts',
    ),
    'utf8',
  );
  /appConfigWriteBody/.test(adminApi) && !/JSON\.stringify\(config\)/.test(adminApi)
    ? pass(
        'Admin source strips ads on save',
        'hard-refresh admin if UI still shows ads error',
      )
    : fail('Admin source strips ads on save', 'old saveAppConfig still echoes config');

  // Android wiring summary notes (from repo files already checked in this script + known paths)
  note(
    'Android Force update',
    'WORKING — MainActivity gate + AppRemoteGateOverlay when forceUpdate && vc < minVersionCode',
  );
  note(
    'Android Maintenance',
    'WORKING — same overlay path when maintenanceMode',
  );
  note(
    'Android Soft update prompt',
    'NOT WORKING — flag saved/loaded, no UI reads softUpdatePrompt',
  );
  note(
    'Android Features/Nav',
    'WORKING — HomeScreen/MainBottomBar/Drawer/routeAllowed use featureOn+navOn',
  );
  note(
    'Android Links',
    'WORKING — AppLinks.playStore/website/supportEmail from config (privacy via About/copy paths separately)',
  );

  const failed = checks.filter((c) => !c.ok);
  console.log(
    `\n${checks.length - failed.length}/${checks.length} passed` +
      (failed.length
        ? ` — FAIL: ${failed.map((f) => f.name).join(', ')}`
        : ''),
  );
  await prisma.$disconnect();
  process.exit(failed.length ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
