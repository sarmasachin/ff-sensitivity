/**
 * Copy CMS admin + public live e2e / security (local Postgres).
 */
import { PrismaClient, AdminRole } from '@prisma/client';
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

const goodBody = {
  rate: {
    enabled: true,
    title: 'Enjoying FF Sensitivity?',
    body: 'A quick rating helps more players.',
    primaryCta: 'Rate on Play Store',
    secondaryCta: 'Not now',
    minSessions: 3,
  },
  share: {
    sheetTitle: 'Share sensitivity',
    bodyTemplate:
      'My Free Fire sensitivity for {{device}}.\n\n{{settings}}\n\nGet yours:',
    footerLine: 'https://sensitivitysettings.com',
    hashtags: '#FreeFire #FFSensitivity',
  },
  about: {
    headline: 'FF Sensitivity',
    blurb: 'Device-aware Free Fire sensitivity tools.',
    versionPrefix: 'Version',
    websiteCta: 'Visit website',
    privacyCta: 'View privacy policy',
  },
  legal: {
    privacyLabel: 'Privacy policy',
    termsLabel: 'Terms of use',
    supportLabel: 'Contact support',
    storeLabel: 'Rate on Google Play',
  },
};

async function main() {
  loadEnv();
  const adminEmail = process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';
  const adminPassword = process.env.SUPERADMIN_PASSWORD ?? '123456';
  const stamp = Date.now().toString(36);

  {
    const r = await req('GET', '/api/v1/admin/copy');
    r.status === 401
      ? pass('admin_auth_required')
      : fail('admin_auth_required', `status=${r.status}`);
  }

  {
    const r = await req('GET', '/api/v1/app/copy');
    r.status === 200 && r.json?.share?.bodyTemplate
      ? pass('public_live_ok')
      : fail('public_live_ok', JSON.stringify(r.json));
  }

  const login = await req('POST', '/api/v1/auth/login', {
    body: { email: adminEmail, password: adminPassword },
  });
  if (!okAuth(login.status) || !login.json?.accessToken) {
    fail('admin_login');
    await prisma.$disconnect();
    process.exit(1);
  }
  pass('admin_login');
  const tok = login.json.accessToken as string;

  {
    const r = await req('GET', '/api/v1/admin/copy', { token: tok });
    r.status === 200 && r.json?.rate?.title
      ? pass('admin_get')
      : fail('admin_get', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/copy', {
      token: tok,
      body: goodBody,
    });
    okAuth(r.status) && r.json?.rate?.minSessions === 3
      ? pass('admin_save_ok')
      : fail('admin_save_ok', `${r.status} ${JSON.stringify(r.json)}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/copy', {
      token: tok,
      body: {
        ...goodBody,
        share: {
          ...goodBody.share,
          bodyTemplate: 'no placeholder here',
        },
      },
    });
    r.status === 400
      ? pass('reject_missing_settings_placeholder')
      : fail('reject_missing_settings_placeholder', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/copy', {
      token: tok,
      body: {
        ...goodBody,
        share: {
          ...goodBody.share,
          bodyTemplate: 'Hi {{device}} {{settings}} {{evil}}',
        },
      },
    });
    r.status === 400
      ? pass('reject_unknown_placeholder')
      : fail('reject_unknown_placeholder', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/copy', {
      token: tok,
      body: {
        ...goodBody,
        rate: { ...goodBody.rate, title: '<script>x</script>' },
      },
    });
    r.status === 400
      ? pass('reject_script_title')
      : fail('reject_script_title', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/copy', {
      token: tok,
      body: {
        ...goodBody,
        share: {
          ...goodBody.share,
          footerLine: 'http://evil.example/phish',
        },
      },
    });
    r.status === 400
      ? pass('reject_http_footer')
      : fail('reject_http_footer', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/copy', {
      token: tok,
      body: {
        ...goodBody,
        share: {
          ...goodBody.share,
          footerLine: 'https://127.0.0.1/admin',
        },
      },
    });
    r.status === 400
      ? pass('reject_private_footer_host')
      : fail('reject_private_footer_host', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/copy', {
      token: tok,
      body: {
        ...goodBody,
        about: { ...goodBody.about, blurb: 'javascript:alert(1)' },
      },
    });
    r.status === 400
      ? pass('reject_js_protocol')
      : fail('reject_js_protocol', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/copy', {
      token: tok,
      body: {
        ...goodBody,
        share: {
          ...goodBody.share,
          bodyTemplate: 'Hi {{ device }} and {{ settings }}',
        },
      },
    });
    okAuth(r.status) &&
    r.json?.share?.bodyTemplate === 'Hi {{device}} and {{settings}}'
      ? pass('normalize_spaced_placeholders')
      : fail(
          'normalize_spaced_placeholders',
          `${r.status} ${JSON.stringify(r.json?.share)}`,
        );
  }

  {
    const r = await req('PUT', '/api/v1/admin/copy', {
      token: tok,
      body: {
        ...goodBody,
        share: {
          ...goodBody.share,
          footerLine: 'javascript:alert(1)',
        },
      },
    });
    r.status === 400
      ? pass('reject_js_footer')
      : fail('reject_js_footer', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/copy', {
      token: tok,
      body: {
        ...goodBody,
        share: {
          ...goodBody.share,
          hashtags: '',
        },
      },
    });
    okAuth(r.status) && r.json?.share?.hashtags === ''
      ? pass('empty_hashtags_ok')
      : fail('empty_hashtags_ok', JSON.stringify(r.json?.share));
  }

  const pub = await req('GET', '/api/v1/app/copy');
  pub.status === 200 && pub.json?.share?.hashtags === ''
    ? pass('public_empty_hashtags')
    : fail('public_empty_hashtags', JSON.stringify(pub.json?.share));

  // Restore a clean default publish for ops
  await req('PUT', '/api/v1/admin/copy', { token: tok, body: goodBody });

  const pub2 = await req('GET', '/api/v1/app/copy');
  pub2.status === 200 && pub2.json?.about?.headline === 'FF Sensitivity'
    ? pass('public_reflects_save')
    : fail('public_reflects_save', JSON.stringify(pub2.json));

  const viewerEmail = `e2e.copy.viewer.${stamp}@example.com`;
  const viewerHash = await bcrypt.hash('viewer-pass-123', 10);
  await prisma.admin.create({
    data: {
      email: viewerEmail,
      passwordHash: viewerHash,
      role: AdminRole.VIEWER,
      allowedModules: ['copy'],
      mustChangePassword: false,
      isActive: true,
    },
  });
  const viewerLogin = await req('POST', '/api/v1/auth/login', {
    body: { email: viewerEmail, password: 'viewer-pass-123' },
  });
  const viewerTok = viewerLogin.json?.accessToken as string | undefined;
  if (!viewerTok) {
    fail('viewer_login');
  } else {
    pass('viewer_login');
    const list = await req('GET', '/api/v1/admin/copy', { token: viewerTok });
    list.status === 200
      ? pass('viewer_can_get')
      : fail('viewer_can_get', `status=${list.status}`);
    const mut = await req('PUT', '/api/v1/admin/copy', {
      token: viewerTok,
      body: goodBody,
    });
    mut.status === 403
      ? pass('viewer_cannot_save')
      : fail('viewer_cannot_save', `status=${mut.status}`);
  }

  const noModEmail = `e2e.copy.nomod.${stamp}@example.com`;
  const noModHash = await bcrypt.hash('nomod-pass-123', 10);
  await prisma.admin.create({
    data: {
      email: noModEmail,
      passwordHash: noModHash,
      role: AdminRole.SUB_ADMIN,
      allowedModules: ['app'],
      mustChangePassword: false,
      isActive: true,
    },
  });
  const noModLogin = await req('POST', '/api/v1/auth/login', {
    body: { email: noModEmail, password: 'nomod-pass-123' },
  });
  const noModTok = noModLogin.json?.accessToken as string | undefined;
  if (noModTok) {
    const r = await req('GET', '/api/v1/admin/copy', { token: noModTok });
    r.status === 403
      ? pass('module_acl_blocks')
      : fail('module_acl_blocks', `status=${r.status}`);
  } else {
    fail('module_acl_blocks', 'no login');
  }

  await prisma.admin.deleteMany({
    where: { email: { in: [viewerEmail, noModEmail] } },
  });

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
  await prisma.$disconnect();
  process.exit(failed.length ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
