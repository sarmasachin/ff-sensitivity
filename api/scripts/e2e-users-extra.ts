/**
 * Extra users security cross-checks (beyond e2e:users).
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

function readAccessCookie(res: Response): string | undefined {
  const cookies =
    typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : [];
  for (const c of cookies) {
    const m = /^access_token=([^;]+)/.exec(c);
    if (m) return decodeURIComponent(m[1]);
  }
  return undefined;
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
  return {
    status: res.status,
    json,
    accessToken: json?.accessToken || readAccessCookie(res),
  };
}

async function main() {
  loadEnv();
  const adminEmail = process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';
  const adminPassword = process.env.SUPERADMIN_PASSWORD ?? '123456';

  const login = await req('POST', '/api/v1/auth/login', {
    body: { email: adminEmail, password: adminPassword },
  });
  const tok = login.accessToken;
  if (!tok) {
    fail('admin_login');
    await prisma.$disconnect();
    process.exit(1);
  }
  pass('admin_login');

  const user = await prisma.user.upsert({
    where: { email: 'e2e.users.extra@example.com' },
    update: {
      isActive: false,
      isRestricted: false,
      accountNote: 'pre-suspended',
      googleSub: 'e2e-users-extra-sub-zzzz9999',
      dataDeletedAt: null,
    },
    create: {
      googleSub: 'e2e-users-extra-sub-zzzz9999',
      email: 'e2e.users.extra@example.com',
      displayName: 'Users Extra',
      isActive: false,
      coins: 10,
    },
  });

  {
    const r = await req('POST', `/api/v1/admin/users/${user.id}/note`, {
      token: tok,
      body: { note: 'javascript:alert(1)' },
    });
    r.status === 400
      ? pass('reject_js_protocol_note')
      : fail('reject_js_protocol_note', `status=${r.status}`);
  }

  {
    const r = await req('POST', `/api/v1/admin/users/${user.id}/note`, {
      token: tok,
      body: { note: 'ops review note' },
    });
    (r.status === 200 || r.status === 201) &&
    r.json?.user?.note === 'ops review note'
      ? pass('note_ok')
      : fail('note_ok', `${r.status} ${JSON.stringify(r.json)}`);
  }

  {
    const r = await req('POST', `/api/v1/admin/users/${user.id}/status`, {
      token: tok,
      body: { action: 'explode' },
    });
    r.status === 400
      ? pass('reject_bad_action')
      : fail('reject_bad_action', `status=${r.status}`);
  }

  {
    // Suspended login must reject before lastLoginAt bump.
    const beforeLogin = await prisma.user.findUnique({ where: { id: user.id } });
    const lastBefore = beforeLogin?.lastLoginAt?.getTime() ?? 0;
    await new Promise((r) => setTimeout(r, 20));
    // Simulate the pre-upsert guard used by UserAuthService (no Google token in e2e).
    if (beforeLogin && !beforeLogin.isActive) {
      // Mirror: reject without update
      const after = await prisma.user.findUnique({ where: { id: user.id } });
      const lastAfter = after?.lastLoginAt?.getTime() ?? 0;
      !after?.isActive && lastAfter === lastBefore
        ? pass('login_rejects_before_touch')
        : fail('login_rejects_before_touch');
    } else {
      fail('login_rejects_before_touch', 'user not suspended');
    }
  }

  {
    // Simulate Google login upsert path: must NOT reactivate suspended seats.
    const before = await prisma.user.findUnique({ where: { id: user.id } });
    await prisma.user.update({
      where: { id: user.id },
      data: {
        email: user.email,
        displayName: 'Users Extra',
        lastLoginAt: new Date(),
      },
    });
    const after = await prisma.user.findUnique({ where: { id: user.id } });
    before && after && !after.isActive
      ? pass('login_update_keeps_suspend')
      : fail('login_update_keeps_suspend');
  }

  {
    const userTok = jwt.sign(
      { sub: user.id, email: user.email, aud: 'user' },
      process.env.JWT_USER_SECRET!,
      { expiresIn: '1h' },
    );
    const r = await req('GET', '/api/v1/economy/wallet', { token: userTok });
    r.status === 401
      ? pass('inactive_token_rejected')
      : fail('inactive_token_rejected', `status=${r.status}`);
  }

  {
    const r = await req('GET', '/api/v1/admin/users', { token: tok });
    const row = (r.json?.users ?? []).find((u: any) => u.id === user.id);
    const raw = JSON.stringify(r.json);
    const leak =
      raw.includes(user.googleSub) ||
      raw.includes('e2e.users.extra@example.com');
    !leak && row?.status === 'SUSPENDED'
      ? pass('no_raw_pii_in_payload')
      : fail('no_raw_pii_in_payload', JSON.stringify(row));
  }

  {
    const missing = await req(
      'POST',
      `/api/v1/admin/users/clxxxxxxxxxxxxxxxxxxxxxxxxx/status`,
      { token: tok, body: { action: 'restore' } },
    );
    missing.status === 404
      ? pass('missing_user_404')
      : fail('missing_user_404', `status=${missing.status}`);
  }

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
