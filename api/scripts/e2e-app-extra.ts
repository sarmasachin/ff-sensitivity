/**
 * Extra app-config security cross-checks (beyond e2e:app).
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
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

function base(overrides: Record<string, unknown> = {}) {
  return {
    status: {
      maintenanceMode: false,
      maintenanceMessage: 'ok maintenance',
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

  const login = await req('POST', '/api/v1/auth/login', {
    body: { email: adminEmail, password: adminPassword },
  });
  const tok = login.json?.accessToken as string | undefined;
  if (!tok) {
    fail('admin_login');
    console.log(`\n0/${checks.length} passed`);
    await prisma.$disconnect();
    process.exit(1);
  }
  pass('admin_login');

  const appUser = await prisma.user.upsert({
    where: { email: 'e2e.app.user@example.com' },
    update: { isActive: true },
    create: {
      googleSub: 'e2e-app-user',
      email: 'e2e.app.user@example.com',
      displayName: 'App User',
      isActive: true,
    },
  });
  const userTok = jwt.sign(
    { sub: appUser.id, email: appUser.email, aud: 'user' },
    process.env.JWT_USER_SECRET!,
    { expiresIn: '1h' },
  );

  {
    const r = await req('GET', '/api/v1/admin/app', { token: userTok });
    r.status === 401
      ? pass('user_jwt_blocked_admin')
      : fail('user_jwt_blocked_admin', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/app', {
      token: tok,
      body: base({
        links: {
          playStoreUrl: 'javascript:alert(1)',
          privacyUrl: 'https://sensitivitysettings.com/privacy-policy',
          websiteUrl: 'https://sensitivitysettings.com',
          supportEmail: 'support@sensitivitysettings.com',
        },
      }),
    });
    r.status === 400
      ? pass('reject_javascript_url')
      : fail('reject_javascript_url', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/app', {
      token: tok,
      body: base({
        links: {
          playStoreUrl: 'https://169.254.169.254/latest',
          privacyUrl: 'https://sensitivitysettings.com/privacy-policy',
          websiteUrl: 'https://sensitivitysettings.com',
          supportEmail: 'support@sensitivitysettings.com',
        },
      }),
    });
    r.status === 400
      ? pass('reject_metadata_ip')
      : fail('reject_metadata_ip', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/app', {
      token: tok,
      body: base({
        links: {
          playStoreUrl: 'https://localhost/x',
          privacyUrl: 'https://sensitivitysettings.com/privacy-policy',
          websiteUrl: 'https://sensitivitysettings.com',
          supportEmail: 'support@sensitivitysettings.com',
        },
      }),
    });
    r.status === 400
      ? pass('reject_localhost_host')
      : fail('reject_localhost_host', `status=${r.status}`);
  }

  // Hostnames starting with "fd" must NOT be blocked (IPv6 ULA false-positive).
  {
    const r = await req('PUT', '/api/v1/admin/app', {
      token: tok,
      body: base({
        links: {
          playStoreUrl:
            'https://play.google.com/store/apps/details?id=com.ffsensitivity.app',
          privacyUrl: 'https://sensitivitysettings.com/privacy-policy',
          websiteUrl: 'https://fda.gov',
          supportEmail: 'support@sensitivitysettings.com',
        },
      }),
    });
    okAuth(r.status)
      ? pass('allow_fda_gov_host')
      : fail('allow_fda_gov_host', `status=${r.status} ${JSON.stringify(r.json)}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/app', {
      token: tok,
      body: base({
        status: {
          maintenanceMode: true,
          maintenanceMessage: 'E2E maintenance window',
          forceUpdate: false,
          softUpdatePrompt: true,
          minVersionCode: 1,
          minVersionName: '1.0.0',
        },
      }),
    });
    const pub = await req('GET', '/api/v1/app/config');
    okAuth(r.status) && pub.json?.status?.maintenanceMode === true
      ? pass('maintenance_roundtrip')
      : fail('maintenance_roundtrip', JSON.stringify(pub.json?.status));
  }

  {
    await req('PUT', '/api/v1/admin/app', {
      token: tok,
      body: base({
        features: {
          redeem: true,
          shop: true,
          challenge: true,
          scratch: true,
          share: true,
          names: true,
          community: true,
          support: true,
          evilAdmin: true,
        },
      }),
    });
    const pub = await req('GET', '/api/v1/app/config');
    pub.json?.features?.evilAdmin === undefined &&
    pub.json?.features?.redeem === true
      ? pass('unknown_feature_keys_stripped')
      : fail('unknown_feature_keys_stripped', JSON.stringify(pub.json?.features));
  }

  const viewerHash = await bcrypt.hash('AppViewer9', 12);
  await prisma.admin.upsert({
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
    body: { email: 'e2e.app.viewer@example.com', password: 'AppViewer9' },
  });
  const vTok = viewerLogin.json?.accessToken as string | undefined;
  if (!vTok) {
    fail('viewer_login');
  } else {
    pass('viewer_login');
    const r = await req('PUT', '/api/v1/admin/app', {
      token: vTok,
      body: base(),
    });
    r.status === 403
      ? pass('viewer_cannot_put')
      : fail(
          'viewer_cannot_put',
          `status=${r.status} — VIEWER can mutate live app config`,
        );
  }

  // Restore safe defaults
  await req('PUT', '/api/v1/admin/app', { token: tok, body: base() });

  const failed = checks.filter((c) => !c.ok).length;
  console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} passed`);
  await prisma.$disconnect();
  process.exit(failed ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
