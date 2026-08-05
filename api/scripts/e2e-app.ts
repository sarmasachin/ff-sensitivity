/**
 * App remote config admin + public live e2e / security (local Postgres).
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
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

function baseConfig(overrides: Record<string, unknown> = {}) {
  return {
    status: {
      maintenanceMode: false,
      maintenanceMessage: 'We are performing scheduled maintenance.',
      forceUpdate: false,
      softUpdatePrompt: true,
      minVersionCode: 1,
      minVersionName: '1.0.0',
    },
    features: {
      redeem: true,
      shop: true,
      challenge: true,
      scratch: true,
      share: true,
      names: true,
      community: true,
      support: true,
    },
    navigation: {
      homeRedeem: true,
      homeShop: true,
      homeChallenge: true,
      homeScratch: true,
      homeNames: true,
      homeShare: true,
      navCommunity: true,
      navSupport: true,
      navAbout: true,
    },
    links: {
      playStoreUrl:
        'https://play.google.com/store/apps/details?id=com.ffsensitivity.app',
      privacyUrl: 'https://sensitivitysettings.com/privacy-policy',
      websiteUrl: 'https://sensitivitysettings.com',
      supportEmail: 'support@sensitivitysettings.com',
    },
    ...overrides,
  };
}

async function main() {
  loadEnv();
  const adminEmail = process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';
  const adminPassword = process.env.SUPERADMIN_PASSWORD ?? '123456';

  {
    const r = await req('GET', '/api/v1/admin/app');
    r.status === 401
      ? pass('admin_auth_required')
      : fail('admin_auth_required', `status=${r.status}`);
  }

  {
    const r = await req('GET', '/api/v1/app/config');
    r.status === 200 && r.json?.status && r.json?.features && r.json?.links
      ? pass('public_config', `min=${r.json.status.minVersionName}`)
      : fail('public_config', `status=${r.status}`);
  }

  const login = await req('POST', '/api/v1/auth/login', {
    body: { email: adminEmail, password: adminPassword },
  });
  if (!okAuth(login.status) || !login.json?.accessToken) {
    fail('admin_login', `status=${login.status}`);
    printSummary();
    await prisma.$disconnect();
    process.exit(1);
  }
  pass('admin_login');
  const tok = login.json.accessToken as string;

  {
    const r = await req('GET', '/api/v1/admin/app', { token: tok });
    r.status === 200 && r.json?.status?.minVersionCode >= 1
      ? pass('admin_get')
      : fail('admin_get', `status=${r.status}`);
  }

  const stamp = Date.now().toString(36);
  {
    const r = await req('PUT', '/api/v1/admin/app', {
      token: tok,
      body: baseConfig({
        status: {
          maintenanceMode: false,
          maintenanceMessage: `E2E ok ${stamp}`,
          forceUpdate: false,
          softUpdatePrompt: true,
          minVersionCode: 1,
          minVersionName: '1.0.0',
        },
        features: {
          redeem: true,
          shop: false,
          challenge: true,
          scratch: true,
          share: true,
          names: true,
          community: true,
          support: true,
        },
      }),
    });
    okAuth(r.status) &&
    r.json?.features?.shop === false &&
    r.json?.status?.maintenanceMessage?.includes(stamp)
      ? pass('admin_save', 'shop off')
      : fail('admin_save', `status=${r.status}`);
  }

  {
    const r = await req('GET', '/api/v1/app/config');
    r.status === 200 && r.json?.features?.shop === false
      ? pass('public_reflects_save')
      : fail('public_reflects_save', JSON.stringify(r.json?.features));
  }

  {
    const r = await req('PUT', '/api/v1/admin/app', {
      token: tok,
      body: baseConfig({
        links: {
          playStoreUrl: 'http://insecure.example/store',
          privacyUrl: 'https://sensitivitysettings.com/privacy-policy',
          websiteUrl: 'https://sensitivitysettings.com',
          supportEmail: 'support@sensitivitysettings.com',
        },
      }),
    });
    r.status === 400
      ? pass('reject_http_url')
      : fail('reject_http_url', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/app', {
      token: tok,
      body: baseConfig({
        links: {
          playStoreUrl: 'https://127.0.0.1/steal',
          privacyUrl: 'https://sensitivitysettings.com/privacy-policy',
          websiteUrl: 'https://sensitivitysettings.com',
          supportEmail: 'support@sensitivitysettings.com',
        },
      }),
    });
    r.status === 400
      ? pass('reject_private_host')
      : fail('reject_private_host', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/app', {
      token: tok,
      body: baseConfig({
        links: {
          playStoreUrl:
            'https://user:pass@play.google.com/store/apps/details?id=x',
          privacyUrl: 'https://sensitivitysettings.com/privacy-policy',
          websiteUrl: 'https://sensitivitysettings.com',
          supportEmail: 'support@sensitivitysettings.com',
        },
      }),
    });
    r.status === 400
      ? pass('reject_url_credentials')
      : fail('reject_url_credentials', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/app', {
      token: tok,
      body: baseConfig({
        status: {
          maintenanceMode: true,
          maintenanceMessage: '<script>alert(1)</script>',
          forceUpdate: false,
          softUpdatePrompt: true,
          minVersionCode: 1,
          minVersionName: '1.0.0',
        },
      }),
    });
    r.status === 400
      ? pass('reject_script_message')
      : fail('reject_script_message', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/app', {
      token: tok,
      body: baseConfig({
        status: {
          maintenanceMode: true,
          maintenanceMessage: '',
          forceUpdate: false,
          softUpdatePrompt: true,
          minVersionCode: 1,
          minVersionName: '1.0.0',
        },
      }),
    });
    r.status === 400
      ? pass('reject_empty_maintenance_msg')
      : fail('reject_empty_maintenance_msg', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/app', {
      token: tok,
      body: baseConfig({
        links: {
          playStoreUrl:
            'https://play.google.com/store/apps/details?id=com.ffsensitivity.app',
          privacyUrl: 'https://sensitivitysettings.com/privacy-policy',
          websiteUrl: 'https://sensitivitysettings.com',
          supportEmail: 'not-an-email',
        },
      }),
    });
    r.status === 400
      ? pass('reject_bad_email')
      : fail('reject_bad_email', `status=${r.status}`);
  }

  // Module ACL — staff without app module
  const noAppHash = await bcrypt.hash('NoAppPass9', 12);
  const noApp = await prisma.admin.upsert({
    where: { email: 'e2e.app.denied@example.com' },
    update: {
      passwordHash: noAppHash,
      role: 'VIEWER',
      allowedModules: ['push'],
      isActive: true,
      mustChangePassword: false,
    },
    create: {
      email: 'e2e.app.denied@example.com',
      passwordHash: noAppHash,
      role: 'VIEWER',
      allowedModules: ['push'],
      isActive: true,
      mustChangePassword: false,
    },
  });
  const deniedLogin = await req('POST', '/api/v1/auth/login', {
    body: { email: noApp.email, password: 'NoAppPass9' },
  });
  if (okAuth(deniedLogin.status) && deniedLogin.json?.accessToken) {
    pass('denied_login');
    const dTok = deniedLogin.json.accessToken as string;
    const get = await req('GET', '/api/v1/admin/app', { token: dTok });
    get.status === 403
      ? pass('module_acl_get')
      : fail('module_acl_get', `status=${get.status}`);
    const put = await req('PUT', '/api/v1/admin/app', {
      token: dTok,
      body: baseConfig(),
    });
    put.status === 403
      ? pass('module_acl_put')
      : fail('module_acl_put', `status=${put.status}`);
  } else {
    fail('denied_login', `status=${deniedLogin.status}`);
  }

  // Viewer with app module can read/save
  const viewerHash = await bcrypt.hash('AppViewer9', 12);
  const viewer = await prisma.admin.upsert({
    where: { email: 'e2e.app.viewer@example.com' },
    update: {
      passwordHash: viewerHash,
      role: 'VIEWER',
      allowedModules: ['app'],
      isActive: true,
      mustChangePassword: false,
    },
    create: {
      email: 'e2e.app.viewer@example.com',
      passwordHash: viewerHash,
      role: 'VIEWER',
      allowedModules: ['app'],
      isActive: true,
      mustChangePassword: false,
    },
  });
  const viewerLogin = await req('POST', '/api/v1/auth/login', {
    body: { email: viewer.email, password: 'AppViewer9' },
  });
  if (okAuth(viewerLogin.status) && viewerLogin.json?.accessToken) {
    pass('viewer_app_login');
    const vTok = viewerLogin.json.accessToken as string;
    const get = await req('GET', '/api/v1/admin/app', { token: vTok });
    get.status === 200
      ? pass('viewer_can_get')
      : fail('viewer_can_get', `status=${get.status}`);
    const put = await req('PUT', '/api/v1/admin/app', {
      token: vTok,
      body: baseConfig(),
    });
    put.status === 403
      ? pass('viewer_cannot_put')
      : fail('viewer_cannot_put', `status=${put.status}`);
  } else {
    fail('viewer_app_login', `status=${viewerLogin.status}`);
  }

  // Restore safe defaults
  {
    const r = await req('PUT', '/api/v1/admin/app', {
      token: tok,
      body: baseConfig(),
    });
    okAuth(r.status) && r.json?.features?.shop === true
      ? pass('restore_defaults')
      : fail('restore_defaults', `status=${r.status}`);
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
