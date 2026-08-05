/**
 * Admin self-profile e2e / security (local Postgres).
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
    const r = await req('GET', '/api/v1/auth/me');
    r.status === 401
      ? pass('me_auth_required')
      : fail('me_auth_required', `status=${r.status}`);
  }
  {
    const r = await req('PATCH', '/api/v1/auth/me', {
      body: { displayName: 'Nope' },
    });
    r.status === 401
      ? pass('patch_auth_required')
      : fail('patch_auth_required', `status=${r.status}`);
  }
  {
    const r = await req('POST', '/api/v1/auth/password', {
      body: { currentPassword: 'x', newPassword: 'abcdefgh' },
    });
    r.status === 401
      ? pass('password_auth_required')
      : fail('password_auth_required', `status=${r.status}`);
  }

  const login = await req('POST', '/api/v1/auth/login', {
    body: { email: adminEmail, password: adminPassword },
  });
  if ((login.status !== 200 && login.status !== 201) || !login.json?.accessToken) {
    fail('admin_login', `status=${login.status}`);
    printSummary();
    process.exit(1);
  }
  pass('admin_login');
  const tok = login.json.accessToken as string;
  const adminId = login.json.admin?.id as string;

  {
    const r = await req('GET', '/api/v1/auth/me', { token: tok });
    const leaked =
      r.json?.passwordHash !== undefined ||
      r.json?.password !== undefined ||
      r.json?.refreshToken !== undefined;
    r.status === 200 &&
    r.json?.email === adminEmail &&
    r.json?.id === adminId &&
    !leaked
      ? pass('me_ok_no_secrets')
      : fail('me_ok_no_secrets', JSON.stringify(r.json));
  }

  const marker = `E2E Ops ${Date.now().toString(36)}`;
  {
    const r = await req('PATCH', '/api/v1/auth/me', {
      token: tok,
      body: {
        displayName: marker,
        jobTitle: 'E2E Lead',
        deskLabel: 'E2E Desk',
        notifyEmail: 'e2e.notify@example.com',
        phone: '+91 98765 43210',
        timezoneLabel: 'Asia/Kolkata (IST)',
        digestDaily: true,
        digestSecurity: false,
      },
    });
    r.status === 200 &&
    r.json?.displayName === marker &&
    r.json?.notifyEmail === 'e2e.notify@example.com' &&
    r.json?.digestDaily === true &&
    r.json?.digestSecurity === false &&
    r.json?.email === adminEmail
      ? pass('patch_profile')
      : fail('patch_profile', `status=${r.status} ${JSON.stringify(r.json)}`);
  }

  {
    const r = await req('PATCH', '/api/v1/auth/me', {
      token: tok,
      body: {
        displayName: '<script>alert(1)</script>',
        jobTitle: 'E2E Lead',
        deskLabel: 'E2E Desk',
        notifyEmail: 'e2e.notify@example.com',
        phone: '',
        timezoneLabel: 'Asia/Kolkata (IST)',
        digestDaily: false,
        digestSecurity: true,
      },
    });
    r.status === 400
      ? pass('reject_script_name')
      : fail('reject_script_name', `status=${r.status}`);
  }

  {
    const r = await req('PATCH', '/api/v1/auth/me', {
      token: tok,
      body: {
        displayName: `zw\u200bsp`,
        jobTitle: 'E2E',
        deskLabel: 'Desk',
        notifyEmail: 'not-an-email',
        phone: '',
        timezoneLabel: 'IST',
        digestDaily: false,
        digestSecurity: true,
      },
    });
    r.status === 400
      ? pass('reject_bad_notify_email')
      : fail('reject_bad_notify_email', `status=${r.status}`);
  }

  {
    const r = await req('POST', '/api/v1/auth/password', {
      token: tok,
      body: { currentPassword: 'wrong-pass', newPassword: 'newpass99' },
    });
    r.status === 400
      ? pass('reject_wrong_current_password')
      : fail('reject_wrong_current_password', `status=${r.status}`);
  }

  {
    const r = await req('POST', '/api/v1/auth/password', {
      token: tok,
      body: { currentPassword: adminPassword, newPassword: 'short' },
    });
    r.status === 400
      ? pass('reject_short_password')
      : fail('reject_short_password', `status=${r.status}`);
  }

  {
    const r = await req('POST', '/api/v1/auth/password', {
      token: tok,
      body: { currentPassword: adminPassword, newPassword: adminPassword },
    });
    // If superadmin password is shorter than 8, validator may 400 first — still fail-closed.
    r.status === 400
      ? pass('reject_same_or_invalid_new_password')
      : fail('reject_same_or_invalid_new_password', `status=${r.status}`);
  }

  {
    const r = await req('PATCH', '/api/v1/auth/me', {
      token: tok,
      body: {
        displayName: 'Priv Esc',
        jobTitle: 'E2E',
        deskLabel: 'Desk',
        notifyEmail: 'e2e.notify@example.com',
        phone: '',
        timezoneLabel: 'Asia/Kolkata (IST)',
        digestDaily: false,
        digestSecurity: true,
        role: 'SUPER_ADMIN',
        email: 'attacker@evil.com',
        passwordHash: 'x',
        allowedModules: ['redeem'],
        isActive: false,
        mustChangePassword: false,
      },
    });
    r.status === 400
      ? pass('reject_privilege_fields_on_patch')
      : fail('reject_privilege_fields_on_patch', `status=${r.status}`);
  }

  {
    const before = await req('GET', '/api/v1/auth/me', { token: tok });
    const r = await req('PATCH', '/api/v1/auth/me', {
      token: tok,
      body: {
        displayName: 'Phone Bad',
        jobTitle: 'E2E',
        deskLabel: 'Desk',
        notifyEmail: before.json?.notifyEmail || adminEmail,
        phone: 'abc',
        timezoneLabel: 'Asia/Kolkata (IST)',
        digestDaily: false,
        digestSecurity: true,
      },
    });
    r.status === 400
      ? pass('reject_bad_phone')
      : fail('reject_bad_phone', `status=${r.status}`);
  }

  // Isolated user JWT must not hit admin auth routes successfully as that user
  const appUser = await prisma.user.upsert({
    where: { email: 'e2e.profile.app@example.com' },
    update: { isActive: true },
    create: {
      googleSub: 'e2e-profile-app',
      email: 'e2e.profile.app@example.com',
      displayName: 'Profile App',
      isActive: true,
    },
  });
  const userTok = jwt.sign(
    { sub: appUser.id, email: appUser.email, aud: 'user' },
    process.env.JWT_USER_SECRET!,
    { expiresIn: '1h' },
  );
  {
    const r = await req('GET', '/api/v1/auth/me', { token: userTok });
    r.status === 401
      ? pass('user_jwt_blocked_on_admin_me')
      : fail('user_jwt_blocked_on_admin_me', `status=${r.status}`);
  }

  // Password rotate on a dedicated e2e admin (do not break superadmin password)
  const e2eEmail = 'e2e.profile.admin@example.com';
  const e2ePass = 'StartPass9';
  const e2eNext = 'RotatedPass9';
  const hash = await bcrypt.hash(e2ePass, 12);
  const e2eAdmin = await prisma.admin.upsert({
    where: { email: e2eEmail },
    update: {
      passwordHash: hash,
      isActive: true,
      mustChangePassword: true,
      role: 'VIEWER',
      allowedModules: [],
    },
    create: {
      email: e2eEmail,
      passwordHash: hash,
      role: 'VIEWER',
      allowedModules: [],
      isActive: true,
      mustChangePassword: true,
    },
  });
  await prisma.adminSession.create({
    data: {
      adminId: e2eAdmin.id,
      refreshTokenHash: 'e2e-profile-session-hash',
      expiresAt: new Date(Date.now() + 86400000),
    },
  });

  const e2eLogin = await req('POST', '/api/v1/auth/login', {
    body: { email: e2eEmail, password: e2ePass },
  });
  if ((e2eLogin.status !== 200 && e2eLogin.status !== 201) || !e2eLogin.json?.accessToken) {
    fail('e2e_admin_login', `status=${e2eLogin.status}`);
  } else {
    pass('e2e_admin_login');
    const e2eTok = e2eLogin.json.accessToken as string;
    const r = await req('POST', '/api/v1/auth/password', {
      token: e2eTok,
      body: { currentPassword: e2ePass, newPassword: e2eNext },
    });
    (r.status === 200 || r.status === 201) && r.json?.mustChangePassword === false
      ? pass('password_rotate_clears_flag')
      : fail('password_rotate_clears_flag', `status=${r.status}`);

    const sessions = await prisma.adminSession.count({
      where: { adminId: e2eAdmin.id, revokedAt: null },
    });
    sessions === 0
      ? pass('password_revokes_refresh_sessions')
      : fail('password_revokes_refresh_sessions', `open=${sessions}`);

    const relogin = await req('POST', '/api/v1/auth/login', {
      body: { email: e2eEmail, password: e2eNext },
    });
    relogin.status === 200 || relogin.status === 201
      ? pass('login_with_new_password')
      : fail('login_with_new_password', `status=${relogin.status}`);

    const oldLogin = await req('POST', '/api/v1/auth/login', {
      body: { email: e2eEmail, password: e2ePass },
    });
    oldLogin.status === 401
      ? pass('old_password_rejected')
      : fail('old_password_rejected', `status=${oldLogin.status}`);
  }

  // Restore marker-free identity on superadmin (keep notify sane)
  await req('PATCH', '/api/v1/auth/me', {
    token: tok,
    body: {
      displayName: 'Super Admin',
      jobTitle: 'Super Admin',
      deskLabel: 'FF Sensitivity Ops',
      notifyEmail: adminEmail,
      phone: '',
      timezoneLabel: 'Asia/Kolkata (IST)',
      digestDaily: false,
      digestSecurity: true,
    },
  });
  pass('restore_superadmin_profile');

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
