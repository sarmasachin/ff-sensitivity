/**
 * Extra admin profile security cross-checks (local Postgres).
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

function okAuth(status: number) {
  return status === 200 || status === 201;
}

async function main() {
  loadEnv();
  const adminEmail = process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';
  const adminPassword = process.env.SUPERADMIN_PASSWORD ?? '123456';

  const login = await req('POST', '/api/v1/auth/login', {
    body: { email: adminEmail, password: adminPassword },
  });
  if (!okAuth(login.status) || !login.json?.accessToken) {
    fail('login', `status=${login.status}`);
    console.log(`\n0/${checks.length} passed`);
    await prisma.$disconnect();
    process.exit(1);
  }
  const tok = login.json.accessToken as string;
  pass('login');

  {
    const r = await req('POST', '/api/v1/auth/password', {
      token: tok,
      body: { currentPassword: adminPassword, newPassword: 'has space1' },
    });
    r.status === 400
      ? pass('reject_password_with_spaces')
      : fail('reject_password_with_spaces', `status=${r.status}`);
  }

  {
    const me = await req('GET', '/api/v1/auth/me', { token: tok });
    const role = me.json?.role;
    const email = me.json?.email;
    await req('PATCH', '/api/v1/auth/me', {
      token: tok,
      body: {
        displayName: 'Extra Persist',
        jobTitle: 'Verifier',
        deskLabel: 'QA Desk',
        notifyEmail: 'extra.notify@example.com',
        phone: '',
        timezoneLabel: 'Asia/Kolkata (IST)',
        digestDaily: true,
        digestSecurity: true,
      },
    });
    const again = await req('GET', '/api/v1/auth/me', { token: tok });
    again.status === 200 &&
    again.json?.displayName === 'Extra Persist' &&
    again.json?.notifyEmail === 'extra.notify@example.com' &&
    again.json?.email === email &&
    again.json?.role === role &&
    again.json?.passwordHash === undefined
      ? pass('patch_persists_login_identity_immutable')
      : fail('patch_persists_login_identity_immutable', JSON.stringify(again.json));
  }

  // Inactive admin JWT must fail on me/patch/password
  const inactiveEmail = 'e2e.profile.inactive@example.com';
  const inactivePass = 'InactivePass9';
  const inactive = await prisma.admin.upsert({
    where: { email: inactiveEmail },
    update: {
      passwordHash: await bcrypt.hash(inactivePass, 12),
      isActive: false,
      role: 'VIEWER',
      allowedModules: [],
    },
    create: {
      email: inactiveEmail,
      passwordHash: await bcrypt.hash(inactivePass, 12),
      role: 'VIEWER',
      allowedModules: [],
      isActive: false,
      mustChangePassword: false,
    },
  });
  const inactiveTok = jwt.sign(
    { sub: inactive.id, email: inactive.email, role: inactive.role },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: '1h' },
  );
  {
    const r = await req('GET', '/api/v1/auth/me', { token: inactiveTok });
    r.status === 401
      ? pass('inactive_admin_me_401')
      : fail('inactive_admin_me_401', `status=${r.status}`);
  }
  {
    const r = await req('PATCH', '/api/v1/auth/me', {
      token: inactiveTok,
      body: {
        displayName: 'Nope',
        jobTitle: 'Nope',
        deskLabel: 'Nope',
        notifyEmail: inactiveEmail,
        phone: '',
        timezoneLabel: 'Asia/Kolkata (IST)',
        digestDaily: false,
        digestSecurity: true,
      },
    });
    r.status === 401
      ? pass('inactive_admin_patch_401')
      : fail('inactive_admin_patch_401', `status=${r.status}`);
  }
  {
    const r = await req('POST', '/api/v1/auth/password', {
      token: inactiveTok,
      body: { currentPassword: inactivePass, newPassword: 'NewInactive9' },
    });
    r.status === 401
      ? pass('inactive_admin_password_401')
      : fail('inactive_admin_password_401', `status=${r.status}`);
  }

  // Password response must not leak hash
  const e2eEmail = 'e2e.profile.extra@example.com';
  const e2ePass = 'ExtraStart9';
  const e2eNext = 'ExtraNext99';
  await prisma.admin.upsert({
    where: { email: e2eEmail },
    update: {
      passwordHash: await bcrypt.hash(e2ePass, 12),
      isActive: true,
      mustChangePassword: true,
      role: 'VIEWER',
      allowedModules: [],
    },
    create: {
      email: e2eEmail,
      passwordHash: await bcrypt.hash(e2ePass, 12),
      role: 'VIEWER',
      allowedModules: [],
      isActive: true,
      mustChangePassword: true,
    },
  });
  const e2eLogin = await req('POST', '/api/v1/auth/login', {
    body: { email: e2eEmail, password: e2ePass },
  });
  if (okAuth(e2eLogin.status) && e2eLogin.json?.accessToken) {
    const r = await req('POST', '/api/v1/auth/password', {
      token: e2eLogin.json.accessToken,
      body: { currentPassword: e2ePass, newPassword: e2eNext },
    });
    okAuth(r.status) &&
    r.json?.passwordHash === undefined &&
    r.json?.password === undefined
      ? pass('password_response_no_secrets')
      : fail('password_response_no_secrets', `status=${r.status}`);
  } else {
    fail('password_response_no_secrets', 'login failed');
  }

  // Restore superadmin profile defaults
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
  pass('restore');

  const ok = checks.filter((c) => c.ok).length;
  console.log(`\n${ok}/${checks.length} passed`);
  await prisma.$disconnect();
  process.exit(checks.some((c) => !c.ok) ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
