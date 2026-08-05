/**
 * Extra copy security cross-checks (beyond e2e:copy).
 */
import { PrismaClient } from '@prisma/client';
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

const base = {
  rate: {
    enabled: false,
    title: 'Rate us',
    body: 'Please rate',
    primaryCta: 'Rate',
    secondaryCta: 'Later',
    minSessions: 5,
  },
  share: {
    sheetTitle: 'Share',
    bodyTemplate: '{{settings}}\n{{device}}',
    footerLine: 'plain footer text ok',
    hashtags: '',
  },
  about: {
    headline: 'FF',
    blurb: 'Blurb',
    versionPrefix: 'Ver',
    websiteCta: 'Site',
    privacyCta: 'Privacy',
  },
  legal: {
    privacyLabel: 'P',
    termsLabel: 'T',
    supportLabel: 'S',
    storeLabel: 'Store',
  },
};

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
    await prisma.$disconnect();
    process.exit(1);
  }
  pass('admin_login');

  {
    const r = await req('PUT', '/api/v1/admin/copy', {
      token: tok,
      body: {
        ...base,
        rate: { ...base.rate, minSessions: 0 },
      },
    });
    r.status === 400
      ? pass('reject_min_sessions_zero')
      : fail('reject_min_sessions_zero', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/copy', {
      token: tok,
      body: {
        ...base,
        rate: { ...base.rate, title: '' },
      },
    });
    r.status === 400
      ? pass('reject_empty_title')
      : fail('reject_empty_title', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/copy', {
      token: tok,
      body: {
        ...base,
        share: {
          ...base.share,
          footerLine: 'https://user:pass@example.com/x',
        },
      },
    });
    r.status === 400
      ? pass('reject_footer_credentials')
      : fail('reject_footer_credentials', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/copy', {
      token: tok,
      body: {
        ...base,
        about: { ...base.about, blurb: 'x'.repeat(700) },
      },
    });
    // MaxLength 600 on DTO → validation, or sanitize slice — either 400 or truncated save
    r.status === 400 || (okAuth(r.status) && r.json?.about?.blurb?.length <= 600)
      ? pass('blurb_length_bounded')
      : fail('blurb_length_bounded', `${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/copy', {
      token: tok,
      body: {
        ...base,
        share: {
          ...base.share,
          bodyTemplate: 'Line1\n{{settings}}\nLine3 {{device}}',
        },
      },
    });
    okAuth(r.status) &&
    String(r.json?.share?.bodyTemplate ?? '').includes('\n')
      ? pass('multiline_template_preserved')
      : fail('multiline_template_preserved', JSON.stringify(r.json?.share));
  }

  {
    const r = await req('PUT', '/api/v1/admin/copy', {
      token: tok,
      body: {
        ...base,
        share: {
          ...base.share,
          footerLine: 'https://192.168.1.10/x',
        },
      },
    });
    r.status === 400
      ? pass('reject_lan_footer')
      : fail('reject_lan_footer', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/copy', {
      token: tok,
      body: base,
    });
    okAuth(r.status) &&
    r.json?.rate?.enabled === false &&
    r.json?.share?.footerLine === 'plain footer text ok'
      ? pass('plain_footer_allowed')
      : fail('plain_footer_allowed', JSON.stringify(r.json));
  }

  {
    const pub = await req('GET', '/api/v1/app/copy');
    pub.status === 200 && pub.json?.rate?.enabled === false
      ? pass('public_rate_off')
      : fail('public_rate_off', JSON.stringify(pub.json));
  }

  {
    // Restore defaults for ops desk
    const restore = {
      rate: {
        enabled: true,
        title: 'Enjoying FF Sensitivity?',
        body: 'A quick Play Store rating helps more players find accurate sensitivity settings.',
        primaryCta: 'Rate on Play Store',
        secondaryCta: 'Not now',
        minSessions: 3,
      },
      share: {
        sheetTitle: 'Share sensitivity',
        bodyTemplate:
          'My Free Fire sensitivity for {{device}} — generated with FF Sensitivity.\n\n{{settings}}\n\nGet yours:',
        footerLine: 'https://sensitivitysettings.com',
        hashtags: '#FreeFire #FFSensitivity',
      },
      about: {
        headline: 'FF Sensitivity',
        blurb:
          'Device-aware Free Fire sensitivity, stylish names, daily challenges, and redeem tools — built for serious players.',
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
    const r = await req('PUT', '/api/v1/admin/copy', {
      token: tok,
      body: restore,
    });
    okAuth(r.status)
      ? pass('restore_defaults')
      : fail('restore_defaults', `status=${r.status}`);
  }

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
