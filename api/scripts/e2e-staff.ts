/**
 * Staff admin invite / ACL / disable security e2e (local Postgres).
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

async function main() {
  loadEnv();
  const adminEmail = process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';
  const adminPassword = process.env.SUPERADMIN_PASSWORD ?? '123456';
  const stamp = Date.now().toString(36);
  const createdEmails: string[] = [];

  {
    const r = await req('GET', '/api/v1/admin/staff');
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
  const meId = login.json?.admin?.id as string | undefined;

  {
    const r = await req('GET', '/api/v1/admin/staff', { token: tok });
    r.status === 200 && Array.isArray(r.json?.staff)
      ? pass('admin_list', `count=${r.json.staff.length}`)
      : fail('admin_list', `status=${r.status}`);
  }

  {
    const r = await req('POST', '/api/v1/admin/staff/invite', {
      token: tok,
      body: {
        name: 'Evil',
        email: `e2e.staff.super.${stamp}@example.com`,
        role: 'SUPER_ADMIN',
        modules: ['redeem'],
      },
    });
    r.status === 400
      ? pass('reject_invite_super_admin')
      : fail('reject_invite_super_admin', `status=${r.status}`);
  }

  {
    const r = await req('POST', '/api/v1/admin/staff/invite', {
      token: tok,
      body: {
        name: 'Bad Mod',
        email: `e2e.staff.badmod.${stamp}@example.com`,
        role: 'VIEWER',
        modules: ['economy', 'ads'],
      },
    });
    r.status === 400
      ? pass('reject_unknown_modules')
      : fail('reject_unknown_modules', `status=${r.status}`);
  }

  const inviteEmail = `e2e.staff.viewer.${stamp}@example.com`;
  createdEmails.push(inviteEmail);
  const invite = await req('POST', '/api/v1/admin/staff/invite', {
    token: tok,
    body: {
      name: 'E2E Viewer',
      email: inviteEmail,
      role: 'VIEWER',
      modules: ['redeem', 'challenge'],
    },
  });
  const invitedId = invite.json?.staff?.id as string | undefined;
  const tempPass = invite.json?.temporaryPassword as string | undefined;
  okAuth(invite.status) &&
  invite.json?.staff?.status === 'INVITED' &&
  Array.isArray(invite.json?.staff?.modules) &&
  invite.json.staff.modules.includes('challenge') &&
  typeof tempPass === 'string' &&
  tempPass.length >= 8
    ? pass('invite_viewer_ok')
    : fail('invite_viewer_ok', JSON.stringify(invite.json));

  if (invitedId && tempPass) {
    const firstLogin = await req('POST', '/api/v1/auth/login', {
      body: { email: inviteEmail, password: tempPass },
    });
    // may require password change but login should succeed if active
    okAuth(firstLogin.status) && firstLogin.json?.accessToken
      ? pass('invite_temp_password_works')
      : fail(
          'invite_temp_password_works',
          `${firstLogin.status} ${JSON.stringify(firstLogin.json)}`,
        );
  } else {
    fail('invite_temp_password_works', 'missing invite');
  }

  {
    const r = await req('POST', '/api/v1/admin/staff/invite', {
      token: tok,
      body: {
        name: 'Dup',
        email: inviteEmail,
        role: 'VIEWER',
        modules: ['redeem'],
      },
    });
    r.status === 409
      ? pass('reject_duplicate_email')
      : fail('reject_duplicate_email', `status=${r.status}`);
  }

  const subEmail = `e2e.staff.sub.${stamp}@example.com`;
  createdEmails.push(subEmail);
  const subInvite = await req('POST', '/api/v1/admin/staff/invite', {
    token: tok,
    body: {
      name: 'E2E Sub',
      email: subEmail,
      role: 'SUB_ADMIN',
      modules: ['claims', 'support'],
    },
  });
  const subId = subInvite.json?.staff?.id as string | undefined;
  okAuth(subInvite.status) && subId
    ? pass('invite_sub_ok')
    : fail('invite_sub_ok', JSON.stringify(subInvite.json));

  if (subId) {
    const mods = await req('PATCH', `/api/v1/admin/staff/${subId}/modules`, {
      token: tok,
      body: { modules: ['claims', 'support', 'community'] },
    });
    okAuth(mods.status) &&
    mods.json?.staff?.modules?.includes('community')
      ? pass('set_modules_ok')
      : fail('set_modules_ok', JSON.stringify(mods.json));

    const dis = await req('POST', `/api/v1/admin/staff/${subId}/disable`, {
      token: tok,
      body: {},
    });
    okAuth(dis.status) && dis.json?.staff?.status === 'DISABLED'
      ? pass('disable_ok')
      : fail('disable_ok', JSON.stringify(dis.json));

    const en = await req('POST', `/api/v1/admin/staff/${subId}/enable`, {
      token: tok,
      body: {},
    });
    okAuth(en.status) && en.json?.staff?.status === 'INVITED'
      ? pass('enable_ok')
      : fail('enable_ok', JSON.stringify(en.json));

    // After disable, JWT must fail (session revoked + isActive false).
    const subLogin = await req('POST', '/api/v1/auth/login', {
      body: {
        email: subEmail,
        password: subInvite.json?.temporaryPassword,
      },
    });
    // Sub was invited then disabled then enabled — still INVITED with temp password.
    // Disable again and assert login fails.
    await req('POST', `/api/v1/admin/staff/${subId}/disable`, {
      token: tok,
      body: {},
    });
    const blocked = await req('POST', '/api/v1/auth/login', {
      body: {
        email: subEmail,
        password: subInvite.json?.temporaryPassword,
      },
    });
    blocked.status === 401 || blocked.status === 403
      ? pass('disable_blocks_login')
      : fail('disable_blocks_login', `status=${blocked.status}`);
    void subLogin;
  }

  if (meId) {
    const self = await req('POST', `/api/v1/admin/staff/${meId}/disable`, {
      token: tok,
      body: {},
    });
    self.status === 403
      ? pass('reject_self_disable')
      : fail('reject_self_disable', `status=${self.status}`);
  } else {
    // resolve super from list
    const list = await req('GET', '/api/v1/admin/staff', { token: tok });
    const superRow = (list.json?.staff ?? []).find(
      (s: any) => s.role === 'SUPER_ADMIN',
    );
    if (superRow) {
      const self = await req(
        'POST',
        `/api/v1/admin/staff/${superRow.id}/disable`,
        { token: tok, body: {} },
      );
      self.status === 403
        ? pass('reject_self_disable')
        : fail('reject_self_disable', `status=${self.status}`);
    } else {
      fail('reject_self_disable', 'no super row');
    }
  }

  {
    const list = await req('GET', '/api/v1/admin/staff', { token: tok });
    const superRow = (list.json?.staff ?? []).find(
      (s: any) => s.role === 'SUPER_ADMIN',
    );
    if (superRow) {
      const r = await req(
        'PATCH',
        `/api/v1/admin/staff/${superRow.id}/modules`,
        { token: tok, body: { modules: ['redeem'] } },
      );
      r.status === 403
        ? pass('reject_touch_super_admin')
        : fail('reject_touch_super_admin', `status=${r.status}`);
    } else {
      fail('reject_touch_super_admin', 'no super');
    }
  }

  // Viewer with staff module cannot mutate
  const viewerEmail = `e2e.staff.aclview.${stamp}@example.com`;
  createdEmails.push(viewerEmail);
  const vHash = await bcrypt.hash('viewer-pass-123', 10);
  await prisma.admin.create({
    data: {
      email: viewerEmail,
      passwordHash: vHash,
      role: AdminRole.VIEWER,
      allowedModules: ['staff'],
      mustChangePassword: false,
      isActive: true,
      displayName: 'ACL Viewer',
    },
  });
  const vLogin = await req('POST', '/api/v1/auth/login', {
    body: { email: viewerEmail, password: 'viewer-pass-123' },
  });
  const vTok = vLogin.json?.accessToken as string | undefined;
  if (!vTok) {
    fail('viewer_login');
  } else {
    pass('viewer_login');
    const list = await req('GET', '/api/v1/admin/staff', { token: vTok });
    list.status === 200
      ? pass('viewer_can_list')
      : fail('viewer_can_list', `status=${list.status}`);
    const mut = await req('POST', '/api/v1/admin/staff/invite', {
      token: vTok,
      body: {
        name: 'X',
        email: `e2e.staff.blocked.${stamp}@example.com`,
        role: 'VIEWER',
        modules: ['redeem'],
      },
    });
    mut.status === 403
      ? pass('viewer_cannot_invite')
      : fail('viewer_cannot_invite', `status=${mut.status}`);
  }

  const noModEmail = `e2e.staff.nomod.${stamp}@example.com`;
  createdEmails.push(noModEmail);
  const nHash = await bcrypt.hash('nomod-pass-123', 10);
  await prisma.admin.create({
    data: {
      email: noModEmail,
      passwordHash: nHash,
      role: AdminRole.SUB_ADMIN,
      allowedModules: ['copy'],
      mustChangePassword: false,
      isActive: true,
    },
  });
  const nLogin = await req('POST', '/api/v1/auth/login', {
    body: { email: noModEmail, password: 'nomod-pass-123' },
  });
  const nTok = nLogin.json?.accessToken as string | undefined;
  if (nTok) {
    const r = await req('GET', '/api/v1/admin/staff', { token: nTok });
    r.status === 403
      ? pass('module_acl_blocks')
      : fail('module_acl_blocks', `status=${r.status}`);
  } else {
    fail('module_acl_blocks', 'no login');
  }

  await prisma.adminSession.deleteMany({
    where: { admin: { email: { in: createdEmails } } },
  });
  await prisma.admin.deleteMany({
    where: { email: { in: createdEmails } },
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
