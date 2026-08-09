/**
 * Ads remote config e2e — Calculate Best Pro Settings gate.
 * Mints admin JWTs directly (cookie/OTP login no longer returns accessToken in body).
 */
import { PrismaClient, AdminRole, AdminModule } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import { adsBody, appBase } from './e2e-ads-body';

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
  checks.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name: string, detail?: string) {
  checks.push({ name, ok: false, detail });
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}
function okAuth(status: number) {
  return status === 200 || status === 201;
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

function mintAdminToken(admin: {
  id: string;
  email: string;
  role: string;
}): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET missing');
  return jwt.sign(
    { sub: admin.id, email: admin.email, role: admin.role },
    secret,
    { expiresIn: '30m' },
  );
}

async function main() {
  loadEnv();
  const adminEmail = process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';

  {
    const r = await req('GET', '/api/v1/admin/ads');
    r.status === 401
      ? pass('ads_auth_required')
      : fail('ads_auth_required', `status=${r.status}`);
  }

  {
    const r = await req('GET', '/api/v1/app/config');
    r.status === 200 &&
    typeof r.json?.ads?.calculate?.enabled === 'boolean' &&
    typeof r.json?.ads?.calculate?.cooldownHours === 'number' &&
    typeof r.json?.ads?.calculate?.buttonLabel === 'string' &&
    typeof r.json?.ads?.calculate?.incompleteMessage === 'string' &&
    typeof r.json?.ads?.dpi?.enabled === 'boolean' &&
    typeof r.json?.ads?.dpi?.buttonLabel === 'string' &&
    typeof r.json?.ads?.quiz?.enabled === 'boolean' &&
    typeof r.json?.ads?.quiz?.cooldownHours === 'number' &&
    typeof r.json?.ads?.quiz?.buttonLabel === 'string' &&
    typeof r.json?.ads?.quiz?.incompleteMessage === 'string' &&
    typeof r.json?.ads?.secondChance?.enabled === 'boolean' &&
    typeof r.json?.ads?.secondChance?.buttonLabel === 'string' &&
    typeof r.json?.ads?.adBonus?.enabled === 'boolean' &&
    typeof r.json?.ads?.adBonus?.buttonLabel === 'string' &&
    typeof r.json?.ads?.checkIn?.enabled === 'boolean' &&
    typeof r.json?.ads?.checkIn?.buttonLabel === 'string' &&
    typeof r.json?.ads?.redeemDaily?.enabled === 'boolean' &&
    typeof r.json?.ads?.redeemDaily?.cooldownHours === 'number' &&
    typeof r.json?.ads?.redeemDaily?.buttonLabel === 'string' &&
    typeof r.json?.ads?.redeemDaily?.incompleteMessage === 'string' &&
    !String(r.json.ads.calculate.buttonLabel).includes('??') &&
    !String(r.json.ads.redeemDaily.buttonLabel).includes('??')
      ? pass(
          'public_ads_shape',
          `redeemDaily enabled=${r.json.ads.redeemDaily.enabled} h=${r.json.ads.redeemDaily.cooldownHours}`,
        )
      : fail('public_ads_shape', JSON.stringify(r.json?.ads));
  }

  const superAdmin = await prisma.admin.findUnique({
    where: { email: adminEmail.toLowerCase() },
  });
  if (!superAdmin || !superAdmin.isActive) {
    fail('superadmin_row', `missing ${adminEmail}`);
    printSummary();
    await prisma.$disconnect();
    process.exit(1);
  }
  const tok = mintAdminToken(superAdmin);
  pass('admin_token_mint');

  {
    const r = await req('GET', '/api/v1/admin/ads', { token: tok });
    r.status === 200 && r.json?.calculate
      ? pass('admin_ads_get')
      : fail('admin_ads_get', `status=${r.status}`);
  }

  const stamp = Date.now().toString(36);
  const customLabel = `E2E Calc ${stamp} \u00b7 Watch Ad`;
  {
    const r = await req('PUT', '/api/v1/admin/ads', {
      token: tok,
      body: adsBody({
        calculate: {
          enabled: false,
          cooldownHours: 0,
          buttonLabel: customLabel,
          incompleteMessage: `E2E incomplete ${stamp}`,
        },
        dpi: {
          enabled: false,
          cooldownHours: 0,
          buttonLabel: `E2E DPI ${stamp}`,
        },
        quiz: {
          enabled: false,
          cooldownHours: 0,
          buttonLabel: `E2E Quiz ${stamp}`,
          incompleteMessage: `E2E quiz incomplete ${stamp}`,
        },
        secondChance: {
          enabled: false,
          cooldownHours: 0,
          buttonLabel: `E2E SC ${stamp}`,
          incompleteMessage: `E2E sc incomplete ${stamp}`,
        },
        adBonus: {
          enabled: false,
          cooldownHours: 4,
          buttonLabel: `E2E Bonus ${stamp}`,
          incompleteMessage: `E2E bonus incomplete ${stamp}`,
        },
        checkIn: {
          enabled: false,
          cooldownHours: 0,
          buttonLabel: `E2E CheckIn ${stamp}`,
          incompleteMessage: `E2E checkin incomplete ${stamp}`,
        },
        redeemDaily: {
          enabled: false,
          cooldownHours: 0,
          buttonLabel: `E2E Redeem ${stamp}`,
          incompleteMessage: `E2E redeem incomplete ${stamp}`,
        },
      }),
    });
    okAuth(r.status) &&
    r.json?.calculate?.enabled === false &&
    r.json?.calculate?.cooldownHours === 0 &&
    r.json?.calculate?.buttonLabel === customLabel &&
    r.json?.dpi?.enabled === false &&
    r.json?.dpi?.buttonLabel === `E2E DPI ${stamp}` &&
    r.json?.quiz?.enabled === false &&
    r.json?.quiz?.buttonLabel === `E2E Quiz ${stamp}` &&
    r.json?.secondChance?.enabled === false &&
    r.json?.secondChance?.buttonLabel === `E2E SC ${stamp}` &&
    r.json?.adBonus?.enabled === false &&
    r.json?.adBonus?.buttonLabel === `E2E Bonus ${stamp}` &&
    r.json?.checkIn?.enabled === false &&
    r.json?.checkIn?.buttonLabel === `E2E CheckIn ${stamp}` &&
    r.json?.redeemDaily?.enabled === false &&
    r.json?.redeemDaily?.cooldownHours === 0 &&
    r.json?.redeemDaily?.buttonLabel === `E2E Redeem ${stamp}` &&
    r.json?.redeemDaily?.incompleteMessage === `E2E redeem incomplete ${stamp}`
      ? pass('admin_ads_save_disable')
      : fail(
          'admin_ads_save_disable',
          `status=${r.status} body=${JSON.stringify(r.json)}`,
        );
  }

  {
    const r = await req('GET', '/api/v1/app/config');
    r.status === 200 &&
    r.json?.ads?.calculate?.enabled === false &&
    r.json?.ads?.calculate?.buttonLabel === customLabel &&
    r.json?.ads?.dpi?.enabled === false &&
    r.json?.ads?.quiz?.enabled === false &&
    r.json?.ads?.quiz?.buttonLabel === `E2E Quiz ${stamp}` &&
    r.json?.ads?.secondChance?.enabled === false &&
    r.json?.ads?.secondChance?.buttonLabel === `E2E SC ${stamp}` &&
    r.json?.ads?.adBonus?.enabled === false &&
    r.json?.ads?.adBonus?.buttonLabel === `E2E Bonus ${stamp}` &&
    r.json?.ads?.checkIn?.enabled === false &&
    r.json?.ads?.checkIn?.buttonLabel === `E2E CheckIn ${stamp}` &&
    r.json?.ads?.redeemDaily?.enabled === false &&
    r.json?.ads?.redeemDaily?.cooldownHours === 0 &&
    r.json?.ads?.redeemDaily?.buttonLabel === `E2E Redeem ${stamp}` &&
    r.json?.ads?.redeemDaily?.incompleteMessage ===
      `E2E redeem incomplete ${stamp}`
      ? pass('public_reflects_ads_save')
      : fail('public_reflects_ads_save', JSON.stringify(r.json?.ads));
  }

  {
    const r = await req('PUT', '/api/v1/admin/app', {
      token: tok,
      body: appBase(),
    });
    okAuth(r.status)
      ? pass('app_save_ok')
      : fail('app_save_ok', `status=${r.status}`);
  }
  {
    const r = await req('GET', '/api/v1/admin/ads', { token: tok });
    r.status === 200 &&
    r.json?.calculate?.enabled === false &&
    r.json?.calculate?.buttonLabel === customLabel &&
    r.json?.dpi?.enabled === false &&
    r.json?.quiz?.enabled === false &&
    r.json?.secondChance?.enabled === false &&
    r.json?.adBonus?.enabled === false &&
    r.json?.checkIn?.enabled === false &&
    r.json?.redeemDaily?.enabled === false
      ? pass('app_save_preserves_ads')
      : fail('app_save_preserves_ads', JSON.stringify(r.json));
  }

  {
    const r = await req('PUT', '/api/v1/admin/ads', {
      token: tok,
      body: adsBody({
        calculate: { enabled: true, cooldownHours: 999, buttonLabel: customLabel },
      }),
    });
    r.status === 400
      ? pass('reject_cooldown_over_168')
      : fail('reject_cooldown_over_168', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/ads', {
      token: tok,
      body: adsBody({ calculate: { buttonLabel: '' } }),
    });
    r.status === 400
      ? pass('reject_blank_button')
      : fail('reject_blank_button', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/ads', {
      token: tok,
      body: adsBody({ redeemDaily: { buttonLabel: '' } }),
    });
    r.status === 400
      ? pass('reject_redeem_daily_blank_button')
      : fail('reject_redeem_daily_blank_button', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/ads', {
      token: tok,
      body: adsBody({
        redeemDaily: { cooldownHours: 999 },
      }),
    });
    r.status === 400
      ? pass('reject_redeem_daily_cooldown')
      : fail('reject_redeem_daily_cooldown', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/ads', {
      token: tok,
      body: adsBody({
        calculate: { incompleteMessage: '<script>alert(1)</script>' },
      }),
    });
    r.status === 400
      ? pass('reject_script_message')
      : fail('reject_script_message', `status=${r.status}`);
  }

  const viewerHash = await bcrypt.hash('AdsViewer9', 12);
  const viewer = await prisma.admin.upsert({
    where: { email: 'e2e.ads.viewer@example.com' },
    update: {
      passwordHash: viewerHash,
      role: AdminRole.VIEWER,
      allowedModules: [AdminModule.app],
      isActive: true,
      mustChangePassword: false,
    },
    create: {
      email: 'e2e.ads.viewer@example.com',
      passwordHash: viewerHash,
      role: AdminRole.VIEWER,
      allowedModules: [AdminModule.app],
      isActive: true,
      mustChangePassword: false,
    },
  });
  const vTok = mintAdminToken(viewer);
  pass('viewer_token_mint');
  {
    const get = await req('GET', '/api/v1/admin/ads', { token: vTok });
    get.status === 200
      ? pass('viewer_can_get_ads')
      : fail('viewer_can_get_ads', `status=${get.status}`);
    const put = await req('PUT', '/api/v1/admin/ads', {
      token: vTok,
      body: adsBody(),
    });
    put.status === 403
      ? pass('viewer_cannot_put_ads')
      : fail('viewer_cannot_put_ads', `status=${put.status}`);
  }

  const deniedHash = await bcrypt.hash('NoAdsPass9', 12);
  const denied = await prisma.admin.upsert({
    where: { email: 'e2e.ads.denied@example.com' },
    update: {
      passwordHash: deniedHash,
      role: AdminRole.VIEWER,
      allowedModules: [AdminModule.push],
      isActive: true,
      mustChangePassword: false,
    },
    create: {
      email: 'e2e.ads.denied@example.com',
      passwordHash: deniedHash,
      role: AdminRole.VIEWER,
      allowedModules: [AdminModule.push],
      isActive: true,
      mustChangePassword: false,
    },
  });
  const dTok = mintAdminToken(denied);
  pass('denied_token_mint');
  {
    const get = await req('GET', '/api/v1/admin/ads', { token: dTok });
    get.status === 403
      ? pass('module_acl_ads_get')
      : fail('module_acl_ads_get', `status=${get.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/ads', {
      token: tok,
      body: adsBody(),
    });
    okAuth(r.status) &&
    r.json?.calculate?.enabled === true &&
    r.json?.calculate?.cooldownHours === 24 &&
    r.json?.dpi?.enabled === true &&
    r.json?.dpi?.cooldownHours === 24 &&
    r.json?.quiz?.enabled === true &&
    r.json?.quiz?.cooldownHours === 24 &&
    r.json?.secondChance?.enabled === true &&
    r.json?.secondChance?.cooldownHours === 0 &&
    r.json?.adBonus?.enabled === true &&
    r.json?.adBonus?.cooldownHours === 4 &&
    r.json?.checkIn?.enabled === true &&
    r.json?.checkIn?.cooldownHours === 24 &&
    r.json?.redeemDaily?.enabled === true &&
    r.json?.redeemDaily?.cooldownHours === 24 &&
    r.json?.redeemDaily?.buttonLabel ===
      'Redeem Now \u00b7 Watch Ad' &&
    typeof r.json?.redeemDaily?.incompleteMessage === 'string' &&
    r.json.redeemDaily.incompleteMessage.length > 0
      ? pass('restore_ads_defaults')
      : fail('restore_ads_defaults', `status=${r.status} body=${JSON.stringify(r.json?.redeemDaily)}`);
  }

  printSummary();
  const failed = checks.filter((c) => !c.ok).length;
  await prisma.$disconnect();
  process.exit(failed ? 1 : 0);
}

function printSummary() {
  const ok = checks.filter((c) => c.ok).length;
  console.log(`\n${ok}/${checks.length} passed`);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
