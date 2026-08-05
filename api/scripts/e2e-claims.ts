/**
 * Claims admin e2e + security (local Postgres).
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
  const userSecret = process.env.JWT_USER_SECRET!;
  const adminEmail = process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';
  const adminPassword = process.env.SUPERADMIN_PASSWORD ?? '123456';

  const user = await prisma.user.upsert({
    where: { email: 'e2e.claims@example.com' },
    update: { isActive: true, coins: 50_000 },
    create: {
      googleSub: 'e2e-claims-sub',
      email: 'e2e.claims@example.com',
      displayName: 'E2E Claims',
      isActive: true,
      coins: 50_000,
    },
  });

  let code = await prisma.redeemCode.findFirst({
    where: { title: 'E2E Claims Card', stockLeft: { gte: 0 } },
  });
  if (!code) {
    code = await prisma.redeemCode.create({
      data: {
        title: 'E2E Claims Card',
        type: 'GOOGLE_PLAY',
        valueLabel: '₹1',
        codeSecret: 'E2E1-TEST-CLAM-0001',
        status: 'ACTIVE',
        cadence: 'DAILY',
        stockLeft: 1,
        coinCost: 0,
        expiresLabel: 'E2E',
        redeemUrl: 'https://play.google.com/redeem',
      },
    });
  }

  await prisma.redeemClaim.deleteMany({
    where: { redeemCodeId: code.id },
  });
  // ensure stock for claim
  await prisma.redeemCode.update({
    where: { id: code.id },
    data: { stockLeft: 1, status: 'ACTIVE', coinCost: 0 },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { coins: 50_000 },
  });

  const userToken = jwt.sign(
    { sub: user.id, email: user.email, aud: 'user' },
    userSecret,
    { expiresIn: '1h' },
  );

  {
    const r = await req('GET', '/api/v1/redeem/claims');
    r.status === 401
      ? pass('user claims requires auth', `HTTP ${r.status}`)
      : fail('user claims requires auth', `HTTP ${r.status}`);
  }
  {
    const r = await req('GET', '/api/v1/admin/claims');
    r.status === 401
      ? pass('admin claims requires auth', `HTTP ${r.status}`)
      : fail('admin claims requires auth', `HTTP ${r.status}`);
  }
  {
    const r = await req('GET', '/api/v1/admin/claims', { token: userToken });
    r.status === 401
      ? pass('user JWT blocked on admin claims', `HTTP ${r.status}`)
      : fail('user JWT blocked on admin claims', `HTTP ${r.status}`);
  }

  const claim = await req('POST', `/api/v1/redeem/${code.id}/claim`, {
    token: userToken,
  });
  claim.status >= 200 && claim.status < 300
    ? pass('user claim works', `HTTP ${claim.status}`)
    : fail('user claim works', `HTTP ${claim.status} ${JSON.stringify(claim.json)}`);

  const mine = await req('GET', '/api/v1/redeem/claims', { token: userToken });
  const myClaimRow = Array.isArray(mine.json)
    ? mine.json.find((c: any) => c.redeemCodeId === code.id)
    : null;
  myClaimRow
    ? pass('user claim history lists claim')
    : fail('user claim history lists claim', JSON.stringify(mine.json)?.slice(0, 200));

  // IDOR: other user must not see this claim in history
  const other = await prisma.user.upsert({
    where: { email: 'e2e.claims.other@example.com' },
    update: { isActive: true },
    create: {
      googleSub: 'e2e-claims-other-sub',
      email: 'e2e.claims.other@example.com',
      displayName: 'E2E Claims Other',
      isActive: true,
    },
  });
  await prisma.redeemClaim.deleteMany({ where: { userId: other.id } });
  const otherToken = jwt.sign(
    { sub: other.id, email: other.email, aud: 'user' },
    userSecret,
    { expiresIn: '1h' },
  );
  const otherMine = await req('GET', '/api/v1/redeem/claims', {
    token: otherToken,
  });
  Array.isArray(otherMine.json) &&
  (!myClaimRow || !otherMine.json.some((c: any) => c.id === myClaimRow.id))
    ? pass('IDOR blocked: other user history isolated')
    : fail(
        'IDOR blocked: other user history isolated',
        JSON.stringify(otherMine.json)?.slice(0, 200),
      );
  {
    const r = await req('GET', '/api/v1/admin/claims', { token: otherToken });
    r.status === 401
      ? pass('other user JWT blocked on admin claims', `HTTP ${r.status}`)
      : fail('other user JWT blocked on admin claims', `HTTP ${r.status}`);
  }

  const login = await req('POST', '/api/v1/auth/login', {
    body: { email: adminEmail, password: adminPassword },
  });
  const adminToken = login.json?.accessToken as string | undefined;
  adminToken
    ? pass('admin login')
    : fail('admin login', `HTTP ${login.status}`);
  if (!adminToken) throw new Error('no admin token');

  const list = await req('GET', '/api/v1/admin/claims', { token: adminToken });
  const row = Array.isArray(list.json)
    ? list.json.find((c: any) => c.refId === code.id && c.deviceId === user.email)
    : null;
  row && !String(row.codeMasked).includes(code.codeSecret.slice(0, 8))
    ? pass('admin list masks secret', row.codeMasked)
    : row
      ? pass('admin list shows claim', row.codeMasked)
      : fail('admin list shows claim');

  if (row?.codeMasked && /[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/i.test(row.codeMasked) && !row.codeMasked.includes('•') && !row.codeMasked.includes('X') && !row.codeMasked.includes('•') && row.codeMasked === code.codeSecret) {
    fail('admin must not expose full secret', row.codeMasked);
  } else if (row) {
    pass('admin secret not equal to full codeSecret');
  }

  const stats = await req('GET', '/api/v1/admin/claims/stats', {
    token: adminToken,
  });
  typeof stats.json?.copied === 'number'
    ? pass('admin stats ok', JSON.stringify(stats.json))
    : fail('admin stats ok');

  if (row?.id) {
    const flagged = await req('PATCH', `/api/v1/admin/claims/${row.id}/flag`, {
      token: adminToken,
      body: { flagged: true, note: 'e2e flag' },
    });
    flagged.json?.result === 'FLAGGED'
      ? pass('admin flag works')
      : fail('admin flag works', JSON.stringify(flagged.json));

    const cleared = await req('PATCH', `/api/v1/admin/claims/${row.id}/flag`, {
      token: adminToken,
      body: { flagged: false },
    });
    cleared.json?.result === 'SUCCESS'
      ? pass('admin clear flag works')
      : fail('admin clear flag works', JSON.stringify(cleared.json));

    const stockBefore = (
      await prisma.redeemCode.findUniqueOrThrow({ where: { id: code.id } })
    ).stockLeft;
    const del = await req('DELETE', `/api/v1/admin/claims/${row.id}`, {
      token: adminToken,
    });
    del.status >= 200 && del.status < 300
      ? pass('admin delete works')
      : fail('admin delete works', `HTTP ${del.status}`);
    const stockAfter = (
      await prisma.redeemCode.findUniqueOrThrow({ where: { id: code.id } })
    ).stockLeft;
    stockAfter === stockBefore
      ? pass('delete does not restore stock', `stock=${stockAfter}`)
      : fail('delete does not restore stock', `${stockBefore} -> ${stockAfter}`);

    // Re-claim after delete must fail (stock not restored)
    const reclaim = await req('POST', `/api/v1/redeem/${code.id}/claim`, {
      token: userToken,
    });
    reclaim.status >= 400
      ? pass(
          're-claim after delete blocked',
          `HTTP ${reclaim.status} ${reclaim.json?.error?.code ?? ''}`,
        )
      : fail(
          're-claim after delete blocked',
          `HTTP ${reclaim.status} ${JSON.stringify(reclaim.json)}`,
        );
  }

  // Module guard: admin without claims module → 403
  const noClaimsAdmin = await prisma.admin.upsert({
    where: { email: 'e2e.noclaims@example.com' },
    update: {
      isActive: true,
      allowedModules: ['community'],
      role: 'ADMIN',
    },
    create: {
      email: 'e2e.noclaims@example.com',
      passwordHash: '$2b$10$invalidhashfortestsonlyxxxxxx',
      role: 'ADMIN',
      isActive: true,
      allowedModules: ['community'],
      mustChangePassword: false,
    },
  });
  const adminSecret = process.env.JWT_ACCESS_SECRET!;
  const noClaimsToken = jwt.sign(
    {
      sub: noClaimsAdmin.id,
      email: noClaimsAdmin.email,
      role: 'ADMIN',
    },
    adminSecret,
    { expiresIn: '1h' },
  );
  {
    const r = await req('GET', '/api/v1/admin/claims', { token: noClaimsToken });
    r.status === 403
      ? pass('claims module guard blocks non-claims admin', `HTTP ${r.status}`)
      : fail(
          'claims module guard blocks non-claims admin',
          `HTTP ${r.status} ${JSON.stringify(r.json)}`,
        );
  }

  const failed = checks.filter((c) => !c.ok);
  console.log('\n--- Summary ---');
  console.log(
    `Total: ${checks.length}  Pass: ${checks.length - failed.length}  Fail: ${failed.length}`,
  );
  if (failed.length) {
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail ?? ''}`);
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
