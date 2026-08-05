/**
 * Names admin + public catalog e2e / security (local Postgres).
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
  checks.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name: string, detail?: string) {
  checks.push({ name, ok: false, detail });
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
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

async function main() {
  loadEnv();
  const adminEmail = process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';
  const adminPassword = process.env.SUPERADMIN_PASSWORD ?? '123456';

  {
    const r = await req('GET', '/api/v1/names/catalog');
    if (
      r.status === 200 &&
      Array.isArray(r.json?.frames) &&
      r.json?.policy?.maxNameChars
    ) {
      if (r.json.policy.remotePackUrl !== undefined) {
        fail('public_catalog_no_remote_url', 'policy leaked remotePackUrl');
      } else {
        pass('public_catalog', `frames=${r.json.frames.length}`);
      }
    } else {
      fail('public_catalog', `status=${r.status}`);
    }
  }

  {
    const r = await req('GET', '/api/v1/admin/names');
    r.status === 401
      ? pass('admin_auth_required')
      : fail('admin_auth_required', `status=${r.status}`);
  }

  const login = await req('POST', '/api/v1/auth/login', {
    body: { email: adminEmail, password: adminPassword },
  });
  const superToken = login.json?.accessToken as string | undefined;
  if (!superToken) {
    fail('super_login', JSON.stringify(login.json));
    console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} passed`);
    await prisma.$disconnect();
    process.exit(1);
  }
  pass('super_login');

  {
    const r = await req('GET', '/api/v1/admin/names', { token: superToken });
    r.status === 200 && r.json?.policy && Array.isArray(r.json.fonts)
      ? pass('admin_get', `fonts=${r.json.fonts.length}`)
      : fail('admin_get', `status=${r.status}`);
  }

  const goodBundle = {
    policy: {
      maxNameChars: 12,
      maxBatchSize: 48,
      blockSpaces: true,
      requireStyleWrap: true,
      remotePackEnabled: false,
      remotePackUrl: '',
    },
    frames: [
      {
        id: 'e2e_classic',
        label: 'E2E Classic',
        prefix: '꧁',
        suffix: '꧂',
        premium: true,
        enabled: true,
      },
    ],
    fonts: [
      { id: 'normal', label: 'Caps', sample: 'GHOST', enabled: true },
      { id: 'wide', label: 'Wide', sample: 'ＧＨＯＳＴ', enabled: false },
    ],
  };

  {
    const r = await req('PUT', '/api/v1/admin/names', {
      token: superToken,
      body: goodBundle,
    });
    r.status === 200 && r.json?.frames?.[0]?.id === 'e2e_classic'
      ? pass('admin_save')
      : fail('admin_save', `status=${r.status} ${JSON.stringify(r.json)}`);
  }

  {
    const r = await req('GET', '/api/v1/names/catalog');
    const ids = (r.json?.frames ?? []).map((f: any) => f.id);
    r.status === 200 && ids.includes('e2e_classic')
      ? pass('public_enabled_only')
      : fail('public_enabled_only', JSON.stringify(ids));
  }

  {
    const r = await req('PUT', '/api/v1/admin/names', {
      token: superToken,
      body: {
        ...goodBundle,
        policy: {
          ...goodBundle.policy,
          remotePackEnabled: true,
          remotePackUrl: 'http://evil.example/pack.json',
        },
      },
    });
    r.status === 400
      ? pass('reject_http_remote')
      : fail('reject_http_remote', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/names', {
      token: superToken,
      body: {
        ...goodBundle,
        policy: {
          ...goodBundle.policy,
          remotePackEnabled: true,
          remotePackUrl: 'javascript:alert(1)',
        },
      },
    });
    r.status === 400
      ? pass('reject_js_remote')
      : fail('reject_js_remote', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/names', {
      token: superToken,
      body: {
        ...goodBundle,
        frames: [
          {
            id: 'bad_affix',
            label: 'Bad',
            prefix: 'X'.repeat(40),
            suffix: '',
            premium: false,
            enabled: true,
          },
        ],
      },
    });
    r.status === 400
      ? pass('reject_long_prefix')
      : fail('reject_long_prefix', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/names', {
      token: superToken,
      body: {
        ...goodBundle,
        fonts: [
          { id: 'normal', label: 'Caps', sample: 'GHOST', enabled: false },
        ],
      },
    });
    r.status === 400
      ? pass('reject_no_font')
      : fail('reject_no_font', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/names', {
      token: superToken,
      body: {
        ...goodBundle,
        policy: { ...goodBundle.policy, maxNameChars: 99 },
      },
    });
    r.status === 400
      ? pass('reject_max_chars_over_ff')
      : fail('reject_max_chars_over_ff', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/names', {
      token: superToken,
      body: {
        ...goodBundle,
        policy: {
          ...goodBundle.policy,
          remotePackEnabled: true,
          remotePackUrl: 'data:text/html,xss',
        },
      },
    });
    r.status === 400
      ? pass('reject_data_remote')
      : fail('reject_data_remote', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/names', {
      token: superToken,
      body: {
        ...goodBundle,
        policy: {
          ...goodBundle.policy,
          remotePackEnabled: true,
          remotePackUrl: 'file:///etc/passwd',
        },
      },
    });
    r.status === 400
      ? pass('reject_file_remote')
      : fail('reject_file_remote', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/names', {
      token: superToken,
      body: {
        ...goodBundle,
        policy: {
          ...goodBundle.policy,
          remotePackEnabled: true,
          remotePackUrl: 'https://169.254.169.254/latest/meta-data/',
        },
      },
    });
    r.status === 400
      ? pass('reject_link_local_remote')
      : fail('reject_link_local_remote', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/names', {
      token: superToken,
      body: {
        ...goodBundle,
        policy: {
          ...goodBundle.policy,
          remotePackEnabled: true,
          remotePackUrl: 'https://user:pass@example.com/pack.json',
        },
      },
    });
    r.status === 400
      ? pass('reject_remote_credentials')
      : fail('reject_remote_credentials', `status=${r.status}`);
  }

  {
    const r = await req('GET', '/api/v1/names/catalog');
    const leaked =
      r.json?.policy?.remotePackUrl !== undefined ||
      r.json?.policy?.remotePackEnabled !== undefined;
    !leaked && r.status === 200
      ? pass('public_no_admin_remote_fields')
      : fail('public_no_admin_remote_fields', JSON.stringify(r.json?.policy));
  }

  const userSecret = process.env.JWT_USER_SECRET!;
  const appUser = await prisma.user.upsert({
    where: { email: 'e2e.names.user@example.com' },
    update: { isActive: true },
    create: {
      googleSub: 'e2e-names-user',
      email: 'e2e.names.user@example.com',
      displayName: 'E2E Names User',
      isActive: true,
    },
  });
  const userTok = jwt.sign(
    { sub: appUser.id, email: appUser.email, aud: 'user' },
    userSecret,
    { expiresIn: '1h' },
  );
  {
    const r = await req('GET', '/api/v1/admin/names', { token: userTok });
    r.status === 401
      ? pass('user_jwt_blocked_on_admin')
      : fail('user_jwt_blocked_on_admin', `status=${r.status}`);
  }

  const noNames = await prisma.admin.upsert({
    where: { email: 'e2e.nonames@example.com' },
    update: {
      isActive: true,
      allowedModules: ['community'],
      role: 'ADMIN',
      mustChangePassword: false,
    },
    create: {
      email: 'e2e.nonames@example.com',
      passwordHash: '$2b$10$invalidhashfortestsonlyxxxxxx',
      role: 'ADMIN',
      isActive: true,
      allowedModules: ['community'],
      mustChangePassword: false,
    },
  });
  const noNamesTok = jwt.sign(
    { sub: noNames.id, email: noNames.email, role: 'ADMIN' },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: '1h' },
  );
  {
    const r = await req('GET', '/api/v1/admin/names', { token: noNamesTok });
    r.status === 403
      ? pass('names_module_guard_403')
      : fail('names_module_guard_403', `HTTP ${r.status}`);
  }

  await req('PUT', '/api/v1/admin/names', {
    token: superToken,
    body: {
      policy: {
        maxNameChars: 12,
        maxBatchSize: 100,
        blockSpaces: true,
        requireStyleWrap: true,
        remotePackEnabled: false,
        remotePackUrl: '',
      },
      frames: [
        {
          id: 'classic',
          label: 'Classic',
          prefix: '꧁',
          suffix: '꧂',
          premium: true,
          enabled: true,
        },
        {
          id: 'skull',
          label: 'Skull',
          prefix: '☠',
          suffix: '☠',
          premium: true,
          enabled: true,
        },
        {
          id: 'royal',
          label: 'Royal',
          prefix: '♛',
          suffix: '♛',
          premium: true,
          enabled: true,
        },
      ],
      fonts: [
        { id: 'normal', label: 'Caps', sample: 'GHOST', enabled: true },
        {
          id: 'small_caps',
          label: 'Small Caps',
          sample: 'ɢʜᴏsᴛ',
          enabled: true,
        },
        { id: 'wide', label: 'Wide', sample: 'ＧＨＯＳＴ', enabled: true },
        { id: 'bubbled', label: 'Bubbled', sample: 'ⒼⒽⓄⓈⓉ', enabled: true },
        {
          id: 'parenthesized',
          label: 'Parenthesized',
          sample: '🄶🄷🄾🅂🅃',
          enabled: false,
        },
      ],
    },
  });
  pass('restore_catalog');

  const ok = checks.filter((c) => c.ok).length;
  console.log(`\n${ok}/${checks.length} passed`);
  await prisma.$disconnect();
  process.exit(ok === checks.length ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
