/**
 * Users admin + suspend / restrict security e2e (local Postgres).
 */
import { PrismaClient, AdminRole } from '@prisma/client';
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

async function main() {
  loadEnv();
  const adminEmail = process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';
  const adminPassword = process.env.SUPERADMIN_PASSWORD ?? '123456';
  const stamp = Date.now().toString(36);

  {
    const r = await req('GET', '/api/v1/admin/users');
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

  {
    const r = await req('GET', '/api/v1/admin/users', { token: tok });
    r.status === 200 && Array.isArray(r.json?.users)
      ? pass('admin_list', `count=${r.json.users.length}`)
      : fail('admin_list', `status=${r.status}`);
  }

  const user = await prisma.user.upsert({
    where: { email: 'e2e.users.app@example.com' },
    update: {
      isActive: true,
      isRestricted: false,
      accountNote: '',
      coins: 120,
      googleSub: 'e2e-users-app-sub-abcd1234',
      // Suspend bumps tokenVersion, so reset it or the next run's JWT is stale.
      tokenVersion: 0,
    },
    create: {
      googleSub: 'e2e-users-app-sub-abcd1234',
      email: 'e2e.users.app@example.com',
      displayName: 'Users App',
      isActive: true,
      coins: 120,
    },
  });

  const userTok = jwt.sign(
    { sub: user.id, email: user.email, aud: 'user', tv: user.tokenVersion },
    process.env.JWT_USER_SECRET!,
    { expiresIn: '1h' },
  );

  {
    const r = await req('GET', '/api/v1/admin/users', { token: userTok });
    r.status === 401
      ? pass('user_jwt_blocked_admin')
      : fail('user_jwt_blocked_admin', `status=${r.status}`);
  }

  {
    const r = await req('GET', '/api/v1/admin/users', { token: tok });
    const row = (r.json?.users ?? []).find((u: any) => u.id === user.id);
    const emailOk = row?.email === 'e2***@example.com';
    const subOk =
      typeof row?.googleSubMasked === 'string' &&
      row.googleSubMasked.includes('1234') &&
      !String(row.googleSubMasked).includes('e2e-users-app-sub');
    emailOk && subOk && row?.status === 'ACTIVE'
      ? pass('pii_masked_in_list')
      : fail('pii_masked_in_list', JSON.stringify(row));
  }

  {
    const r = await req('POST', `/api/v1/admin/users/bad id!!/status`, {
      token: tok,
      body: { action: 'suspend' },
    });
    r.status === 400
      ? pass('reject_bad_user_id')
      : fail('reject_bad_user_id', `status=${r.status}`);
  }

  {
    const r = await req('POST', `/api/v1/admin/users/${user.id}/status`, {
      token: tok,
      body: { action: 'restrict', note: '<script>x</script>' },
    });
    r.status === 400
      ? pass('reject_script_note')
      : fail('reject_script_note', `status=${r.status}`);
  }

  {
    const r = await req('POST', `/api/v1/admin/users/${user.id}/status`, {
      token: tok,
      body: { action: 'restrict', note: 'soft gate redeem' },
    });
    okAuth(r.status) && r.json?.user?.status === 'RESTRICTED'
      ? pass('restrict_ok')
      : fail('restrict_ok', `${r.status} ${JSON.stringify(r.json)}`);
  }

  {
    const codes = await prisma.redeemCode.findMany({
      where: { status: 'ACTIVE', stockLeft: { gt: 0 } },
      take: 1,
    });
    if (!codes[0]) {
      fail('restricted_blocks_redeem', 'no ACTIVE redeem codes to assert');
    } else {
      const r = await req('POST', `/api/v1/redeem/${codes[0].id}/claim`, {
        token: userTok,
      });
      r.status === 403 && r.json?.error?.code === 'USER_RESTRICTED'
        ? pass('restricted_blocks_redeem')
        : fail(
            'restricted_blocks_redeem',
            `${r.status} ${JSON.stringify(r.json)}`,
          );
    }
  }

  {
    const r = await req('POST', `/api/v1/admin/users/${user.id}/status`, {
      token: tok,
      body: { action: 'restore' },
    });
    okAuth(r.status) && r.json?.user?.status === 'ACTIVE'
      ? pass('restore_from_restricted')
      : fail('restore_from_restricted', `${r.status} ${JSON.stringify(r.json)}`);
  }

  {
    const r = await req('POST', `/api/v1/admin/users/${user.id}/status`, {
      token: tok,
      body: { action: 'suspend', note: 'abuse' },
    });
    okAuth(r.status) && r.json?.user?.status === 'SUSPENDED'
      ? pass('suspend_ok')
      : fail('suspend_ok', `${r.status} ${JSON.stringify(r.json)}`);
  }

  {
    const r = await req('POST', `/api/v1/admin/users/${user.id}/status`, {
      token: tok,
      body: { action: 'restrict' },
    });
    r.status === 409 && r.json?.error?.code === 'USER_STATUS_CONFLICT'
      ? pass('restrict_cannot_unsuspend')
      : fail(
          'restrict_cannot_unsuspend',
          `${r.status} ${JSON.stringify(r.json)}`,
        );
  }

  {
    const still = await prisma.user.findUnique({ where: { id: user.id } });
    still && !still.isActive
      ? pass('suspend_persists_after_restrict_attempt')
      : fail('suspend_persists_after_restrict_attempt');
  }

  {
    const r = await req('GET', '/api/v1/economy/wallet', { token: userTok });
    r.status === 401
      ? pass('suspended_jwt_rejected')
      : fail('suspended_jwt_rejected', `status=${r.status}`);
  }

  {
    const still = await prisma.user.findUnique({ where: { id: user.id } });
    still && !still.isActive
      ? pass('suspend_persists_db')
      : fail('suspend_persists_db');
  }

  {
    const r = await req('POST', `/api/v1/admin/users/${user.id}/status`, {
      token: tok,
      body: { action: 'restore' },
    });
    okAuth(r.status) && r.json?.user?.status === 'ACTIVE'
      ? pass('restore_ok')
      : fail('restore_ok', `${r.status} ${JSON.stringify(r.json)}`);
  }

  const viewerEmail = `e2e.users.viewer.${stamp}@example.com`;
  const viewerHash = await bcrypt.hash('viewer-pass-123', 10);
  const viewer = await prisma.admin.create({
    data: {
      email: viewerEmail,
      passwordHash: viewerHash,
      role: AdminRole.VIEWER,
      allowedModules: ['users'],
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
    const list = await req('GET', '/api/v1/admin/users', { token: viewerTok });
    list.status === 200
      ? pass('viewer_can_list')
      : fail('viewer_can_list', `status=${list.status}`);
    const mut = await req('POST', `/api/v1/admin/users/${user.id}/status`, {
      token: viewerTok,
      body: { action: 'suspend' },
    });
    mut.status === 403
      ? pass('viewer_cannot_mutate')
      : fail('viewer_cannot_mutate', `status=${mut.status}`);
    const noteMut = await req('POST', `/api/v1/admin/users/${user.id}/note`, {
      token: viewerTok,
      body: { note: 'viewer should not write' },
    });
    noteMut.status === 403
      ? pass('viewer_cannot_note')
      : fail('viewer_cannot_note', `status=${noteMut.status}`);
  }

  const noModEmail = `e2e.users.nomod.${stamp}@example.com`;
  const noModHash = await bcrypt.hash('nomod-pass-123', 10);
  await prisma.admin.create({
    data: {
      email: noModEmail,
      passwordHash: noModHash,
      role: AdminRole.SUB_ADMIN,
      allowedModules: ['wallets'],
      mustChangePassword: false,
      isActive: true,
    },
  });
  const noModLogin = await req('POST', '/api/v1/auth/login', {
    body: { email: noModEmail, password: 'nomod-pass-123' },
  });
  const noModTok = noModLogin.json?.accessToken as string | undefined;
  if (noModTok) {
    const r = await req('GET', '/api/v1/admin/users', { token: noModTok });
    r.status === 403
      ? pass('module_acl_blocks')
      : fail('module_acl_blocks', `status=${r.status}`);
  } else {
    fail('module_acl_blocks', 'no login');
  }

  await prisma.admin.deleteMany({
    where: { email: { in: [viewerEmail, noModEmail] } },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { isActive: true, isRestricted: false, accountNote: '' },
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
