/**
 * Extra staff security cross-checks (beyond e2e:staff).
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
  const cleanup: string[] = [];

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
    const r = await req('POST', '/api/v1/admin/staff/invite', {
      token: tok,
      body: {
        name: '<script>x</script>',
        email: `e2e.staff.script.${stamp}@example.com`,
        role: 'VIEWER',
        modules: ['redeem'],
      },
    });
    r.status === 400
      ? pass('reject_script_name')
      : fail('reject_script_name', `status=${r.status}`);
  }

  {
    const r = await req('POST', '/api/v1/admin/staff/invite', {
      token: tok,
      body: {
        name: 'Bad mail',
        email: 'not-an-email',
        role: 'VIEWER',
        modules: ['redeem'],
      },
    });
    r.status === 400
      ? pass('reject_bad_email')
      : fail('reject_bad_email', `status=${r.status}`);
  }

  {
    const r = await req('PATCH', '/api/v1/admin/staff/bad id!!/modules', {
      token: tok,
      body: { modules: ['redeem'] },
    });
    r.status === 400
      ? pass('reject_bad_id')
      : fail('reject_bad_id', `status=${r.status}`);
  }

  // ADMIN with staff can invite VIEWER but not ADMIN
  const adminSeat = `e2e.staff.adminseat.${stamp}@example.com`;
  cleanup.push(adminSeat);
  const aHash = await bcrypt.hash('admin-seat-123', 10);
  await prisma.admin.create({
    data: {
      email: adminSeat,
      passwordHash: aHash,
      role: AdminRole.ADMIN,
      allowedModules: ['staff', 'redeem'],
      mustChangePassword: false,
      isActive: true,
      displayName: 'Admin Seat',
    },
  });
  const aLogin = await req('POST', '/api/v1/auth/login', {
    body: { email: adminSeat, password: 'admin-seat-123' },
  });
  const aTok = aLogin.json?.accessToken as string | undefined;
  if (!aTok) {
    fail('admin_seat_login');
  } else {
    pass('admin_seat_login');
    const deny = await req('POST', '/api/v1/admin/staff/invite', {
      token: aTok,
      body: {
        name: 'Peer Admin',
        email: `e2e.staff.peeradmin.${stamp}@example.com`,
        role: 'ADMIN',
        modules: ['redeem'],
      },
    });
    deny.status === 403
      ? pass('admin_cannot_invite_admin')
      : fail('admin_cannot_invite_admin', `status=${deny.status}`);

    const okEmail = `e2e.staff.fromadmin.${stamp}@example.com`;
    cleanup.push(okEmail);
    const ok = await req('POST', '/api/v1/admin/staff/invite', {
      token: aTok,
      body: {
        name: 'From Admin',
        email: okEmail,
        role: 'VIEWER',
        modules: ['redeem', 'staff'],
      },
    });
    // staff module stripped for non-super → still succeeds with redeem
    okAuth(ok.status) &&
    ok.json?.staff?.status === 'INVITED' &&
    !(ok.json?.staff?.modules ?? []).includes('staff')
      ? pass('admin_invite_strips_staff_module')
      : fail(
          'admin_invite_strips_staff_module',
          JSON.stringify(ok.json?.staff),
        );

    // Resend only for INVITED
    const id = ok.json?.staff?.id as string | undefined;
    if (id) {
      const resend = await req(
        'POST',
        `/api/v1/admin/staff/${id}/resend-invite`,
        { token: aTok, body: {} },
      );
      okAuth(resend.status) &&
      typeof resend.json?.temporaryPassword === 'string'
        ? pass('resend_invite_ok')
        : fail('resend_invite_ok', JSON.stringify(resend.json));
    } else {
      fail('resend_invite_ok', 'no id');
    }

    // Non-super editing other modules must preserve an existing staff grant.
    const peerEmail = `e2e.staff.peerstaff.${stamp}@example.com`;
    cleanup.push(peerEmail);
    const pHash = await bcrypt.hash('peer-pass-123', 10);
    const peer = await prisma.admin.create({
      data: {
        email: peerEmail,
        passwordHash: pHash,
        role: AdminRole.SUB_ADMIN,
        allowedModules: ['staff', 'redeem', 'claims'],
        mustChangePassword: false,
        isActive: true,
        displayName: 'Peer With Staff',
        lastLoginAt: new Date(),
      },
    });
    const patch = await req(
      'PATCH',
      `/api/v1/admin/staff/${peer.id}/modules`,
      {
        token: aTok,
        body: { modules: ['redeem', 'claims', 'community'] },
      },
    );
    okAuth(patch.status) &&
    (patch.json?.staff?.modules ?? []).includes('staff') &&
    (patch.json?.staff?.modules ?? []).includes('community')
      ? pass('set_modules_preserves_staff_grant')
      : fail(
          'set_modules_preserves_staff_grant',
          JSON.stringify(patch.json?.staff),
        );

    const bareEmail = `e2e.staff.bare.${stamp}@example.com`;
    cleanup.push(bareEmail);
    const bHash = await bcrypt.hash('bare-pass-123', 10);
    const bare = await prisma.admin.create({
      data: {
        email: bareEmail,
        passwordHash: bHash,
        role: AdminRole.VIEWER,
        allowedModules: ['redeem'],
        mustChangePassword: false,
        isActive: true,
        displayName: 'Bare Viewer',
        lastLoginAt: new Date(),
      },
    });
    const denyGrant = await req(
      'PATCH',
      `/api/v1/admin/staff/${bare.id}/modules`,
      {
        token: aTok,
        body: { modules: ['redeem', 'staff'] },
      },
    );
    denyGrant.status === 403
      ? pass('admin_cannot_grant_staff_module')
      : fail('admin_cannot_grant_staff_module', `status=${denyGrant.status}`);
  }

  {
    const missing = await req(
      'POST',
      `/api/v1/admin/staff/clxxxxxxxxxxxxxxxxxxxxxxxxx/enable`,
      { token: tok, body: {} },
    );
    missing.status === 404
      ? pass('missing_staff_404')
      : fail('missing_staff_404', `status=${missing.status}`);
  }

  await prisma.adminSession.deleteMany({
    where: { admin: { email: { in: cleanup } } },
  });
  await prisma.admin.deleteMany({ where: { email: { in: cleanup } } });

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
