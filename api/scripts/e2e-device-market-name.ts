/**
 * Market-name heartbeat: only factory-code MODEL is replaced.
 * Motorola-style names stay untouched. Live local API + DB.
 */
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';

const API = process.env.API_BASE ?? 'http://127.0.0.1:4000';
const prisma = new PrismaClient();

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

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];
function pass(name: string, detail?: string) {
  checks.push({ name: name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name: string, detail?: string) {
  checks.push({ name: name, ok: false, detail });
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

/** Mirrors DeviceMarketName.looksLikeFactoryCode */
function looksLikeFactoryCode(model: string): boolean {
  const m = model.trim();
  if (m.length < 4 || m.length > 24) return false;
  if (/\s/.test(m)) return false;
  const compact = m.replace(/[-_]/g, '');
  if (compact.length < 4 || !/^[A-Za-z0-9]+$/.test(compact)) return false;
  const letters = [...compact].filter((c) => /[A-Za-z]/.test(c)).length;
  const digits = [...compact].filter((c) => /[0-9]/.test(c)).length;
  return letters >= 1 && digits >= 2;
}

function isUsableMarketName(name: string, model: string): boolean {
  const n = name.trim().replace(/\s+/g, ' ');
  if (n.length < 2 || n.length > 60) return false;
  if (n.toLowerCase() === model.trim().toLowerCase()) return false;
  if (looksLikeFactoryCode(n)) return false;
  return /[A-Za-z]/.test(n);
}

function forHeartbeat(rawModel: string, marketName: string | null): string {
  const model = rawModel.trim();
  if (!model || !looksLikeFactoryCode(model)) return model;
  if (marketName && isUsableMarketName(marketName, model)) {
    return marketName.trim().replace(/\s+/g, ' ');
  }
  return model;
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
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json };
}

function userTok(userId: string, email: string) {
  return jwt.sign(
    { sub: userId, email, aud: 'user' },
    process.env.JWT_USER_SECRET!,
    { expiresIn: '1h' },
  );
}

async function heartbeat(
  token: string,
  installId: string,
  brand: string,
  model: string,
  androidVersion: string,
) {
  return req('POST', '/api/v1/devices/heartbeat', {
    token,
    body: {
      installId,
      brand,
      model,
      androidVersion,
      appVersion: '1.0.2',
      appVersionCode: 102,
    },
  });
}

function runLogicMatrix() {
  const cases: Array<{
    name: string;
    model: string;
    market: string | null;
    expect: string;
  }> = [
    {
      name: 'motorola_untouched_even_if_prop',
      model: 'motorola edge 60 pro',
      market: 'edge 60 pro',
      expect: 'motorola edge 60 pro',
    },
    {
      name: 'pixel_untouched',
      model: 'Pixel 8 Pro',
      market: 'Pixel 8 Pro',
      expect: 'Pixel 8 Pro',
    },
    {
      name: 'xiaomi_code_to_poco',
      model: '23128PC33I',
      market: 'POCO X6 5G',
      expect: 'POCO X6 5G',
    },
    {
      name: 'xiaomi_code_no_prop_keeps_code',
      model: '23128PC33I',
      market: null,
      expect: '23128PC33I',
    },
    {
      name: 'xiaomi_prop_same_as_code_keeps_code',
      model: '23128PC33I',
      market: '23128PC33I',
      expect: '23128PC33I',
    },
    {
      name: 'xiaomi_prop_other_code_rejected',
      model: '23128PC33I',
      market: 'M2101K6G',
      expect: '23128PC33I',
    },
    {
      name: 'oppo_cph_to_name',
      model: 'CPH2449',
      market: 'OnePlus 11',
      expect: 'OnePlus 11',
    },
    {
      name: 'samsung_sm_to_name',
      model: 'SM-S918B',
      market: 'Galaxy S23 Ultra',
      expect: 'Galaxy S23 Ultra',
    },
    {
      name: 'samsung_no_prop_keeps_sm',
      model: 'SM-S918B',
      market: '',
      expect: 'SM-S918B',
    },
    {
      name: 'emulator_code_no_prop',
      model: 'sdk_gphone64_x86_64',
      market: null,
      expect: 'sdk_gphone64_x86_64',
    },
    {
      name: 'word_brand_not_code',
      model: 'Redmi',
      market: 'Redmi Note 13',
      expect: 'Redmi',
    },
    {
      name: 'empty_model',
      model: '',
      market: 'POCO X6 5G',
      expect: '',
    },
  ];

  for (const c of cases) {
    const got = forHeartbeat(c.model, c.market);
    got === c.expect
      ? pass(`logic_${c.name}`, got || '(empty)')
      : fail(`logic_${c.name}`, `got=${got} expect=${c.expect}`);
  }

  looksLikeFactoryCode('23128PC33I') &&
  looksLikeFactoryCode('CPH2449') &&
  looksLikeFactoryCode('SM-S918B') &&
  !looksLikeFactoryCode('motorola edge 60 pro') &&
  !looksLikeFactoryCode('Pixel 8')
    ? pass('logic_code_detector_split')
    : fail('logic_code_detector_split');
}

async function main() {
  loadEnv();
  runLogicMatrix();

  const stamp = Date.now().toString(36);
  const motoId = `dev_e2emktm${stamp}`;
  const xiaomiId = `dev_e2emktx${stamp}`;
  const emailMoto = `e2e.mkt.moto.${stamp}@example.com`;
  const emailXm = `e2e.mkt.xm.${stamp}@example.com`;

  const motoUser = await prisma.user.create({
    data: {
      email: emailMoto,
      displayName: 'Moto Check',
      googleSub: `sub_moto_${stamp}`,
      lastLoginAt: new Date(),
    },
  });
  const xmUser = await prisma.user.create({
    data: {
      email: emailXm,
      displayName: 'Xiaomi Check',
      googleSub: `sub_xm_${stamp}`,
      lastLoginAt: new Date(),
    },
  });

  let httpRan = false;
  try {
    const ping = await fetch(`${API}/api/v1/app/config`, {
      signal: AbortSignal.timeout(4000),
    });
    httpRan = ping.ok;
  } catch {
    httpRan = false;
  }

  if (!httpRan) {
    fail('api_up', 'local API not reachable');
  } else {
    const motoJwt = userTok(motoUser.id, motoUser.email);
    const xmJwt = userTok(xmUser.id, xmUser.email);

    const motoHb = await heartbeat(
      motoJwt,
      motoId,
      'motorola',
      'motorola edge 60 pro',
      '16',
    );
    motoHb.status === 201 || motoHb.status === 200
      ? pass('heartbeat_motorola')
      : fail('heartbeat_motorola', `status=${motoHb.status}`);

    const oldXm = await heartbeat(
      xmJwt,
      xiaomiId,
      'Xiaomi',
      '23128PC33I',
      '15',
    );
    oldXm.status === 201 || oldXm.status === 200
      ? pass('heartbeat_xiaomi_old_code')
      : fail('heartbeat_xiaomi_old_code', `status=${oldXm.status}`);

    const adminEmail =
      process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';
    const admin = await prisma.admin.findFirst({
      where: { email: adminEmail, isActive: true },
    });
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!admin || !secret) {
      fail('admin_jwt', 'missing admin or JWT_ACCESS_SECRET');
    } else {
      const adminTok = jwt.sign(
        { sub: admin.id, email: admin.email, role: admin.role },
        secret,
        { expiresIn: '15m' },
      );

      const before = await req('GET', '/api/v1/admin/users', {
        token: adminTok,
      });
      const beforeRows = before.json?.users ?? [];
      const motoBefore = beforeRows.find((r: any) => r.id === motoUser.id);
      const xmBefore = beforeRows.find((r: any) => r.id === xmUser.id);
      String(motoBefore?.deviceLabel || '').includes('motorola edge 60 pro')
        ? pass('users_motorola_name')
        : fail('users_motorola_name', JSON.stringify(motoBefore));
      String(xmBefore?.deviceLabel || '').includes('23128PC33I')
        ? pass('users_old_apk_still_shows_code')
        : fail('users_old_apk_still_shows_code', JSON.stringify(xmBefore));

      const newXm = await heartbeat(
        xmJwt,
        xiaomiId,
        'Xiaomi',
        'POCO X6 5G',
        '15',
      );
      newXm.status === 201 || newXm.status === 200
        ? pass('heartbeat_xiaomi_market_name')
        : fail('heartbeat_xiaomi_market_name', `status=${newXm.status}`);

      const after = await req('GET', '/api/v1/admin/users', {
        token: adminTok,
      });
      const afterRows = after.json?.users ?? [];
      const motoAfter = afterRows.find((r: any) => r.id === motoUser.id);
      const xmAfter = afterRows.find((r: any) => r.id === xmUser.id);
      String(motoAfter?.deviceLabel || '') === 'motorola edge 60 pro · 16'
        ? pass('users_motorola_untouched_after_xiaomi_update')
        : fail(
            'users_motorola_untouched_after_xiaomi_update',
            JSON.stringify(motoAfter),
          );
      String(xmAfter?.deviceLabel || '') === 'POCO X6 5G · 15'
        ? pass('users_xiaomi_shows_market_name')
        : fail('users_xiaomi_shows_market_name', JSON.stringify(xmAfter));

      const devices = await req('GET', '/api/v1/admin/devices', {
        token: adminTok,
      });
      const list = devices.json?.devices ?? [];
      const motoDev = list.find((d: any) => d.deviceId === motoId);
      const xmDev = list.find((d: any) => d.deviceId === xiaomiId);
      motoDev?.model === 'motorola edge 60 pro'
        ? pass('devices_motorola_untouched')
        : fail('devices_motorola_untouched', JSON.stringify(motoDev));
      xmDev?.model === 'POCO X6 5G'
        ? pass('devices_xiaomi_market_name')
        : fail('devices_xiaomi_market_name', JSON.stringify(xmDev));
    }

    const bad = await heartbeat(
      xmJwt,
      xiaomiId,
      'Xiaomi',
      'javascript:alert(1)',
      '15',
    );
    bad.status === 400
      ? pass('heartbeat_rejects_unsafe_model')
      : fail('heartbeat_rejects_unsafe_model', `status=${bad.status}`);

    const longName = 'POCO X6 5G Extra Long Market Name That Fits Under 60ch';
    longName.length <= 60
      ? pass('long_market_name_under_dto_cap', `${longName.length} chars`)
      : fail('long_market_name_under_dto_cap', `${longName.length}`);
    const longHb = await heartbeat(xmJwt, xiaomiId, 'Xiaomi', longName, '15');
    longHb.status === 201 || longHb.status === 200
      ? pass('heartbeat_accepts_long_market_name')
      : fail('heartbeat_accepts_long_market_name', `status=${longHb.status}`);
  }

  await prisma.devicePushToken.deleteMany({
    where: { userId: { in: [motoUser.id, xmUser.id] } },
  });
  await prisma.deviceInstall.deleteMany({
    where: { installId: { in: [motoId, xiaomiId] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [motoUser.id, xmUser.id] } },
  });

  const failed = checks.filter((x) => !x.ok).length;
  console.log(`\n${checks.filter((x) => x.ok).length}/${checks.length} passed`);
  await prisma.$disconnect();
  process.exit(failed ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
