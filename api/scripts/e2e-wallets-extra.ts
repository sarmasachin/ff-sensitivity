/**
 * Extra wallets security cross-checks (beyond e2e:wallets).
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

  const user = await prisma.user.upsert({
    where: { email: 'e2e.wallets.extra@example.com' },
    update: {
      isActive: true,
      coins: 500,
      walletFrozen: false,
      walletNote: '',
    },
    create: {
      googleSub: 'e2e-wallets-extra',
      email: 'e2e.wallets.extra@example.com',
      displayName: 'Wallets Extra',
      isActive: true,
      coins: 500,
    },
  });
  const userTok = jwt.sign(
    { sub: user.id, email: user.email, aud: 'user' },
    process.env.JWT_USER_SECRET!,
    { expiresIn: '1h' },
  );

  {
    const r = await req('POST', `/api/v1/admin/wallets/bad id!!/grant`, {
      token: tok,
      body: {
        amount: 1,
        reason: 'bad id',
        requestId: `req_badid_${stamp}`,
      },
    });
    r.status === 400
      ? pass('reject_bad_user_id')
      : fail('reject_bad_user_id', `status=${r.status}`);
  }

  {
    const r = await req('POST', `/api/v1/admin/wallets/${user.id}/grant`, {
      token: tok,
      body: {
        amount: 0,
        reason: 'zero',
        requestId: `req_zero_${stamp}`,
      },
    });
    r.status === 400
      ? pass('reject_zero_amount')
      : fail('reject_zero_amount', `status=${r.status}`);
  }

  {
    const r = await req('POST', `/api/v1/admin/wallets/${user.id}/grant`, {
      token: tok,
      body: {
        amount: -5,
        reason: 'neg',
        requestId: `req_neg_${stamp}`,
      },
    });
    r.status === 400
      ? pass('reject_negative_amount')
      : fail('reject_negative_amount', `status=${r.status}`);
  }

  {
    const r = await req('POST', `/api/v1/admin/wallets/${user.id}/freeze`, {
      token: tok,
      body: { action: 'freeze' },
    });
    okAuth(r.status)
      ? pass('freeze_for_shop_test')
      : fail('freeze_for_shop_test', `status=${r.status}`);
  }

  {
    const r = await req('POST', '/api/v1/economy/shop/purchase', {
      token: userTok,
      body: {
        itemId: 'boost_checkin_plus',
        requestId: `shop_froz_${stamp}`,
      },
    });
    r.status === 403
      ? pass('frozen_blocks_shop')
      : fail('frozen_blocks_shop', `status=${r.status} ${JSON.stringify(r.json)}`);
  }

  {
    // Ops clawback while frozen must still work
    const before = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const r = await req('POST', `/api/v1/admin/wallets/${user.id}/revoke`, {
      token: tok,
      body: {
        amount: 25,
        reason: 'clawback while frozen',
        requestId: `req_claw_${stamp}`,
      },
    });
    okAuth(r.status) && r.json?.wallet?.balance === before.coins - 25
      ? pass('revoke_allowed_while_frozen')
      : fail(
          'revoke_allowed_while_frozen',
          `status=${r.status} ${JSON.stringify(r.json)}`,
        );
  }

  {
    const r = await req('POST', `/api/v1/admin/wallets/${user.id}/freeze`, {
      token: tok,
      body: { action: 'unfreeze' },
    });
    okAuth(r.status)
      ? pass('unfreeze_cleanup')
      : fail('unfreeze_cleanup', `status=${r.status}`);
  }

  // Viewer cannot freeze
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
    const freeze = await req('POST', `/api/v1/admin/wallets/${user.id}/freeze`, {
      token: vTok,
      body: { action: 'freeze' },
    });
    freeze.status === 403
      ? pass('viewer_cannot_freeze')
      : fail('viewer_cannot_freeze', `status=${freeze.status}`);
    const revoke = await req('POST', `/api/v1/admin/wallets/${user.id}/revoke`, {
      token: vTok,
      body: {
        amount: 1,
        reason: 'viewer revoke',
        requestId: `req_vr_${stamp}`,
      },
    });
    revoke.status === 403
      ? pass('viewer_cannot_revoke')
      : fail('viewer_cannot_revoke', `status=${revoke.status}`);
  } else {
    fail('viewer_login');
  }

  // Suspended / inactive user
  const dead = await prisma.user.upsert({
    where: { email: 'e2e.wallets.dead@example.com' },
    update: { isActive: false, coins: 10, walletFrozen: false },
    create: {
      googleSub: 'e2e-wallets-dead',
      email: 'e2e.wallets.dead@example.com',
      displayName: 'Dead',
      isActive: false,
      coins: 10,
    },
  });
  {
    const r = await req('POST', `/api/v1/admin/wallets/${dead.id}/grant`, {
      token: tok,
      body: {
        amount: 5,
        reason: 'to inactive',
        requestId: `req_dead_${stamp}`,
      },
    });
    r.status === 404
      ? pass('reject_grant_inactive')
      : fail('reject_grant_inactive', `status=${r.status}`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { walletFrozen: false },
  });

  const failed = checks.filter((c) => !c.ok).length;
  console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} passed`);
  await prisma.$disconnect();
  process.exit(failed ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
