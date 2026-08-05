/**
 * Wallets admin + freeze / grant security e2e (local Postgres).
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
    const r = await req('GET', '/api/v1/admin/wallets');
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
    const r = await req('GET', '/api/v1/admin/wallets', { token: tok });
    r.status === 200 && Array.isArray(r.json?.wallets)
      ? pass('admin_list', `count=${r.json.wallets.length}`)
      : fail('admin_list', `status=${r.status}`);
  }

  const user = await prisma.user.upsert({
    where: { email: 'e2e.wallets.app@example.com' },
    update: {
      isActive: true,
      coins: 200,
      walletFrozen: false,
      walletNote: '',
    },
    create: {
      googleSub: 'e2e-wallets-app',
      email: 'e2e.wallets.app@example.com',
      displayName: 'Wallets App',
      isActive: true,
      coins: 200,
    },
  });
  const userTok = jwt.sign(
    { sub: user.id, email: user.email, aud: 'user' },
    process.env.JWT_USER_SECRET!,
    { expiresIn: '1h' },
  );

  {
    const r = await req('GET', '/api/v1/admin/wallets', { token: userTok });
    r.status === 401
      ? pass('user_jwt_blocked_admin')
      : fail('user_jwt_blocked_admin', `status=${r.status}`);
  }

  {
    const r = await req('GET', '/api/v1/economy/wallet', { token: userTok });
    okAuth(r.status) &&
    r.json?.coins === 200 &&
    r.json?.frozen === false
      ? pass('user_wallet_ok')
      : fail('user_wallet_ok', JSON.stringify(r.json));
  }

  {
    const r = await req('POST', `/api/v1/admin/wallets/${user.id}/grant`, {
      token: tok,
      body: {
        amount: 50,
        reason: 'E2E goodwill',
        requestId: `req_grant_${stamp}`,
        coins: 99999,
        balance: 0,
      },
    });
    r.status === 400
      ? pass('reject_privilege_fields')
      : fail('reject_privilege_fields', `status=${r.status}`);
  }

  {
    const r = await req('POST', `/api/v1/admin/wallets/${user.id}/grant`, {
      token: tok,
      body: {
        amount: 50,
        reason: '<script>x</script>',
        requestId: `req_bad_${stamp}`,
      },
    });
    r.status === 400
      ? pass('reject_script_reason')
      : fail('reject_script_reason', `status=${r.status}`);
  }

  {
    const r = await req('POST', `/api/v1/admin/wallets/${user.id}/grant`, {
      token: tok,
      body: {
        amount: 500_000,
        reason: 'too much',
        requestId: `req_big_${stamp}`,
      },
    });
    r.status === 400
      ? pass('reject_over_cap_amount')
      : fail('reject_over_cap_amount', `status=${r.status}`);
  }

  {
    const r = await req('POST', `/api/v1/admin/wallets/${user.id}/grant`, {
      token: tok,
      body: {
        amount: 50,
        reason: 'E2E goodwill',
        requestId: `req_grant_${stamp}`,
      },
    });
    okAuth(r.status) && r.json?.wallet?.balance === 250
      ? pass('admin_grant', `bal=${r.json.wallet.balance}`)
      : fail('admin_grant', JSON.stringify(r.json));
  }

  {
    const r = await req('POST', `/api/v1/admin/wallets/${user.id}/grant`, {
      token: tok,
      body: {
        amount: 50,
        reason: 'E2E goodwill',
        requestId: `req_grant_${stamp}`,
      },
    });
    okAuth(r.status) && r.json?.alreadyApplied === true
      ? pass('grant_idempotent')
      : fail('grant_idempotent', JSON.stringify(r.json));
  }

  {
    const r = await req('POST', `/api/v1/admin/wallets/${user.id}/revoke`, {
      token: tok,
      body: {
        amount: 30,
        reason: 'E2E clawback',
        requestId: `req_rev_${stamp}`,
      },
    });
    okAuth(r.status) && r.json?.wallet?.balance === 220
      ? pass('admin_revoke', `bal=${r.json.wallet.balance}`)
      : fail('admin_revoke', JSON.stringify(r.json));
  }

  {
    const r = await req('POST', `/api/v1/admin/wallets/${user.id}/revoke`, {
      token: tok,
      body: {
        amount: 9999,
        reason: 'too much revoke',
        requestId: `req_over_${stamp}`,
      },
    });
    r.status === 409
      ? pass('reject_over_revoke')
      : fail('reject_over_revoke', `status=${r.status}`);
  }

  {
    const r = await req('POST', `/api/v1/admin/wallets/${user.id}/freeze`, {
      token: tok,
      body: { action: 'freeze' },
    });
    okAuth(r.status) && r.json?.wallet?.status === 'FROZEN'
      ? pass('admin_freeze')
      : fail('admin_freeze', JSON.stringify(r.json));
  }

  {
    const r = await req('GET', '/api/v1/economy/wallet', { token: userTok });
    okAuth(r.status) && r.json?.frozen === true
      ? pass('user_sees_frozen')
      : fail('user_sees_frozen', JSON.stringify(r.json));
  }

  {
    const r = await req('POST', '/api/v1/economy/challenge/earn', {
      token: userTok,
      body: { kind: 'CHECKIN' },
    });
    r.status === 403
      ? pass('frozen_blocks_earn')
      : fail('frozen_blocks_earn', `status=${r.status}`);
  }

  {
    const r = await req('POST', `/api/v1/admin/wallets/${user.id}/grant`, {
      token: tok,
      body: {
        amount: 10,
        reason: 'while frozen',
        requestId: `req_froz_${stamp}`,
      },
    });
    r.status === 409
      ? pass('frozen_blocks_grant')
      : fail('frozen_blocks_grant', `status=${r.status}`);
  }

  {
    const r = await req('POST', `/api/v1/admin/wallets/${user.id}/freeze`, {
      token: tok,
      body: { action: 'unfreeze' },
    });
    okAuth(r.status) && r.json?.wallet?.status === 'ACTIVE'
      ? pass('admin_unfreeze')
      : fail('admin_unfreeze', JSON.stringify(r.json));
  }

  {
    const r = await req('GET', '/api/v1/admin/wallets/ledger', { token: tok });
    const staff = (r.json?.ledger ?? []).filter(
      (e: any) => e.actor === 'staff' && e.walletId === user.id,
    );
    r.status === 200 && staff.length >= 1
      ? pass('ledger_has_staff', `n=${staff.length}`)
      : fail('ledger_has_staff', `status=${r.status}`);
    const leaked = JSON.stringify(r.json ?? {}).includes(user.email);
    !leaked
      ? pass('ledger_email_masked')
      : fail('ledger_email_masked', 'full email leaked');
  }

  {
    const list = await req('GET', '/api/v1/admin/wallets', { token: tok });
    const hit = (list.json?.wallets ?? []).find((w: any) => w.id === user.id);
    const leaked = JSON.stringify(hit ?? {}).includes(user.email.split('@')[0] + '@');
    // mask keeps first 2 chars of local — full email must not appear
    const fullLeak = JSON.stringify(hit ?? {}).includes(user.email);
    !fullLeak
      ? pass('list_email_masked')
      : fail('list_email_masked', JSON.stringify(hit));
    void leaked;
  }

  // ACL
  const noHash = await bcrypt.hash('NoWalPass9', 12);
  await prisma.admin.upsert({
    where: { email: 'e2e.wallets.denied@example.com' },
    update: {
      passwordHash: noHash,
      role: 'VIEWER',
      allowedModules: ['devices'],
      isActive: true,
      mustChangePassword: false,
    },
    create: {
      email: 'e2e.wallets.denied@example.com',
      passwordHash: noHash,
      role: 'VIEWER',
      allowedModules: ['devices'],
      isActive: true,
      mustChangePassword: false,
    },
  });
  const deniedLogin = await req('POST', '/api/v1/auth/login', {
    body: {
      email: 'e2e.wallets.denied@example.com',
      password: 'NoWalPass9',
    },
  });
  if (okAuth(deniedLogin.status) && deniedLogin.json?.accessToken) {
    pass('denied_login');
    const dTok = deniedLogin.json.accessToken as string;
    const list = await req('GET', '/api/v1/admin/wallets', { token: dTok });
    list.status === 403
      ? pass('module_acl_list')
      : fail('module_acl_list', `status=${list.status}`);
  } else {
    fail('denied_login');
  }

  const vHash = await bcrypt.hash('WalViewer9', 12);
  await prisma.admin.upsert({
    where: { email: 'e2e.wallets.viewer@example.com' },
    update: {
      passwordHash: vHash,
      role: 'VIEWER',
      allowedModules: ['wallets'],
      isActive: true,
      mustChangePassword: false,
    },
    create: {
      email: 'e2e.wallets.viewer@example.com',
      passwordHash: vHash,
      role: 'VIEWER',
      allowedModules: ['wallets'],
      isActive: true,
      mustChangePassword: false,
    },
  });
  const viewerLogin = await req('POST', '/api/v1/auth/login', {
    body: {
      email: 'e2e.wallets.viewer@example.com',
      password: 'WalViewer9',
    },
  });
  if (okAuth(viewerLogin.status) && viewerLogin.json?.accessToken) {
    pass('viewer_login');
    const vTok = viewerLogin.json.accessToken as string;
    const list = await req('GET', '/api/v1/admin/wallets', { token: vTok });
    list.status === 200
      ? pass('viewer_can_list')
      : fail('viewer_can_list', `status=${list.status}`);
    const grant = await req('POST', `/api/v1/admin/wallets/${user.id}/grant`, {
      token: vTok,
      body: {
        amount: 1,
        reason: 'viewer try',
        requestId: `req_v_${stamp}`,
      },
    });
    grant.status === 403
      ? pass('viewer_cannot_grant')
      : fail('viewer_cannot_grant', `status=${grant.status}`);
  } else {
    fail('viewer_login');
  }

  // cleanup freeze state
  await prisma.user.update({
    where: { id: user.id },
    data: { walletFrozen: false },
  });

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
