/**
 * Ops settings persist / ACL / step-up e2e (local Postgres).
 */
import { PrismaClient, AdminRole, AdminModule } from '@prisma/client';
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

async function main() {
  loadEnv();
  const adminEmail = process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';
  const adminPassword = process.env.SUPERADMIN_PASSWORD ?? '123456';
  const stamp = Date.now().toString(36);
  const cleanupEmails: string[] = [];

  {
    const r = await req('GET', '/api/v1/admin/settings');
    r.status === 401
      ? pass('admin_auth_required')
      : fail('admin_auth_required', `status=${r.status}`);
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

  let baseline: any = null;
  {
    const r = await req('GET', '/api/v1/admin/settings', { token: tok });
    if (
      r.status === 200 &&
      r.json?.preferences &&
      r.json?.session &&
      r.json?.security
    ) {
      baseline = r.json;
      pass('admin_get');
    } else {
      fail('admin_get', `status=${r.status}`);
    }
  }

  {
    const r = await req('PUT', '/api/v1/admin/settings', {
      token: tok,
      body: {
        preferences: {
          ...baseline.preferences,
          defaultLanding: '/evil',
        },
        session: baseline.session,
        security: baseline.security,
      },
    });
    r.status === 400
      ? pass('reject_bad_landing')
      : fail('reject_bad_landing', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/settings', {
      token: tok,
      body: {
        preferences: baseline.preferences,
        session: { ...baseline.session, idleTimeoutMinutes: 2 },
        security: baseline.security,
      },
    });
    r.status === 400
      ? pass('reject_idle_too_low')
      : fail('reject_idle_too_low', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/settings', {
      token: tok,
      body: {
        preferences: {
          ...baseline.preferences,
          timezoneLabel: '<script>x</script>',
        },
        session: baseline.session,
        security: baseline.security,
      },
    });
    r.status === 400
      ? pass('reject_unsafe_tz')
      : fail('reject_unsafe_tz', `status=${r.status}`);
  }

  const savedBundle = {
    preferences: {
      ...baseline.preferences,
      defaultLanding: '/audit',
      compactTables: true,
    },
    session: {
      ...baseline.session,
      idleTimeoutMinutes: 30,
      singleSessionOnly: true,
    },
    security: {
      ...baseline.security,
      requireReauthForStaffInvite: true,
      ipAllowlistNote: 'Office VPN only — e2e note.',
    },
  };

  {
    const r = await req('PUT', '/api/v1/admin/settings', {
      token: tok,
      body: savedBundle,
    });
    r.status === 200 && r.json?.preferences?.defaultLanding === '/audit'
      ? pass('admin_save')
      : fail('admin_save', `status=${r.status}`);
  }

  {
    const r = await req('POST', '/api/v1/admin/staff/invite', {
      token: tok,
      body: {
        name: 'No Reauth',
        email: `e2e.settings.noreauth.${stamp}@example.com`,
        role: 'VIEWER',
        modules: ['support'],
      },
    });
    r.status === 403
      ? pass('staff_invite_requires_reauth')
      : fail('staff_invite_requires_reauth', `status=${r.status}`);
  }

  {
    const r = await req('POST', '/api/v1/admin/staff/invite', {
      token: tok,
      body: {
        name: 'With Reauth',
        email: `e2e.settings.ok.${stamp}@example.com`,
        role: 'VIEWER',
        modules: ['support'],
        currentPassword: adminPassword,
      },
    });
    if (okAuth(r.status) && r.json?.staff?.id) {
      cleanupEmails.push(`e2e.settings.ok.${stamp}@example.com`);
      pass('staff_invite_with_reauth');
    } else {
      fail('staff_invite_with_reauth', `status=${r.status}`);
    }
  }

  const viewerEmail = `e2e.settings.viewer.${stamp}@example.com`;
  cleanupEmails.push(viewerEmail);
  const hash = await bcrypt.hash('SettingsE2e!23456', 10);
  await prisma.admin.create({
    data: {
      email: viewerEmail,
      passwordHash: hash,
      role: AdminRole.VIEWER,
      allowedModules: [AdminModule.settings],
      isActive: true,
      mustChangePassword: false,
    },
  });

  {
    const vLogin = await req('POST', '/api/v1/auth/login', {
      body: { email: viewerEmail, password: 'SettingsE2e!23456' },
    });
    const vTok = vLogin.json?.accessToken as string | undefined;
    if (!vTok) {
      fail('viewer_login');
    } else {
      const g = await req('GET', '/api/v1/admin/settings', { token: vTok });
      g.status === 200
        ? pass('viewer_can_read')
        : fail('viewer_can_read', `status=${g.status}`);
      const p = await req('PUT', '/api/v1/admin/settings', {
        token: vTok,
        body: savedBundle,
      });
      p.status === 403
        ? pass('viewer_cannot_write')
        : fail('viewer_cannot_write', `status=${p.status}`);
      const purge = await req('POST', '/api/v1/admin/settings/audit-purge', {
        token: vTok,
        body: {},
      });
      purge.status === 403
        ? pass('viewer_cannot_purge')
        : fail('viewer_cannot_purge', `status=${purge.status}`);
    }
  }

  const deniedEmail = `e2e.settings.denied.${stamp}@example.com`;
  cleanupEmails.push(deniedEmail);
  await prisma.admin.create({
    data: {
      email: deniedEmail,
      passwordHash: hash,
      role: AdminRole.VIEWER,
      allowedModules: [AdminModule.support],
      isActive: true,
      mustChangePassword: false,
    },
  });
  {
    const dLogin = await req('POST', '/api/v1/auth/login', {
      body: { email: deniedEmail, password: 'SettingsE2e!23456' },
    });
    const dTok = dLogin.json?.accessToken as string | undefined;
    if (!dTok) {
      fail('denied_login');
    } else {
      const r = await req('GET', '/api/v1/admin/settings', { token: dTok });
      r.status === 403
        ? pass('module_guard_denies')
        : fail('module_guard_denies', `status=${r.status}`);
    }
  }

  // Restore baseline so other suites stay stable.
  if (baseline) {
    await req('PUT', '/api/v1/admin/settings', {
      token: tok,
      body: {
        preferences: baseline.preferences,
        session: baseline.session,
        security: {
          ...baseline.security,
          requireReauthForReveal: false,
          requireReauthForStaffInvite: false,
          requireReauthForWalletAdjust: false,
          auditRetentionDays: baseline.security?.auditRetentionDays ?? 90,
          auditAutoPurge: baseline.security?.auditAutoPurge ?? true,
        },
      },
    });
  }

  await prisma.admin.deleteMany({ where: { email: { in: cleanupEmails } } });

  const failed = checks.filter((c) => !c.ok);
  console.log(
    `\n${checks.length - failed.length}/${checks.length} passed` +
      (failed.length ? ` · ${failed.length} failed` : ''),
  );
  await prisma.$disconnect();
  process.exit(failed.length ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
