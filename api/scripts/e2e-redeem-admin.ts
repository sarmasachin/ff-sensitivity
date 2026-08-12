/**
 * Live admin redeem CRUD + app catalog sees the same row.
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

type Check = { name: string; ok: boolean };
const checks: Check[] = [];
function pass(name: string, detail?: string) {
  checks.push({ name, ok: true });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name: string, detail?: string) {
  checks.push({ name, ok: false });
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
    json = { raw: text.slice(0, 160) };
  }
  return { status: res.status, json };
}

async function main() {
  loadEnv();
  const stamp = Date.now().toString();
  const secret = `LIVEE2E${stamp}ADMIN01`;
  const admin = await prisma.admin.findFirst({
    where: {
      email: process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com',
      isActive: true,
    },
  });
  if (!admin || !process.env.JWT_ACCESS_SECRET || !process.env.JWT_USER_SECRET) {
    fail('admin_jwt');
    process.exit(1);
  }
  const adminTok = jwt.sign(
    { sub: admin.id, email: admin.email, role: admin.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' },
  );

  const created = await req('POST', '/api/v1/admin/redeem', {
    token: adminTok,
    body: {
      title: 'Live E2E Card',
      type: 'GOOGLE_PLAY',
      valueLabel: '₹1 TEST',
      codeSecret: secret,
      status: 'ACTIVE',
      cadence: 'DAILY',
      stockLeft: 1,
      coinCost: null,
      expiresLabel: 'E2E',
      tip: 'Live desk',
      redeemUrl: 'https://play.google.com/redeem',
    },
  });
  const id = created.json?.id as string | undefined;
  (created.status === 200 || created.status === 201) && id
    ? pass('admin_create', id)
    : fail('admin_create', JSON.stringify(created.json));

  const listed = await req('GET', '/api/v1/admin/redeem', { token: adminTok });
  const row = (listed.json?.codes ?? []).find((r: any) => r.id === id);
  listed.status === 200 && row && row.codeSecret === '' && row.codeMasked
    ? pass('admin_list_masks_secret')
    : fail('admin_list_masks_secret', JSON.stringify(row));

  const stored = id
    ? await prisma.redeemCode.findUnique({
        where: { id },
        select: { codeSecret: true },
      })
    : null;
  stored?.codeSecret === secret
    ? pass('db_stores_posted_secret')
    : fail(
        'db_stores_posted_secret',
        `posted=${secret} db=${stored?.codeSecret ?? 'missing'}`,
      );

  const revealed = await req('POST', `/api/v1/admin/redeem/${id}/reveal`, {
    token: adminTok,
    body: {},
  });
  (revealed.status === 200 || revealed.status === 201) &&
  revealed.json?.code === secret
    ? pass('admin_reveal_live_secret')
    : fail(
        'admin_reveal_live_secret',
        `status=${revealed.status} posted=${secret} body=${JSON.stringify(revealed.json)}`,
      );

  const patched = await req('PATCH', `/api/v1/admin/redeem/${id}`, {
    token: adminTok,
    body: { title: 'Live E2E Card Renamed', stockLeft: 1 },
  });
  patched.status === 200 && patched.json?.title === 'Live E2E Card Renamed'
    ? pass('admin_update')
    : fail('admin_update', JSON.stringify(patched.json));

  const user = await prisma.user.create({
    data: {
      email: `e2e.redeem.live.${stamp}@example.com`,
      displayName: 'Redeem Live',
      googleSub: `sub_redeem_live_${stamp}`,
      coins: 0,
      isActive: true,
    },
  });
  const userTok = jwt.sign(
    { sub: user.id, email: user.email, aud: 'user', tv: 0 },
    process.env.JWT_USER_SECRET,
    { expiresIn: '1h' },
  );
  const catalog = await req('GET', '/api/v1/redeem/catalog', { token: userTok });
  const hit = (catalog.json?.items ?? []).find((i: any) => i.id === id);
  catalog.status === 200 && hit && hit.code == null
    ? pass('app_catalog_sees_admin_row')
    : fail('app_catalog_sees_admin_row', JSON.stringify(hit));

  const claim = await req('POST', `/api/v1/redeem/${id}/claim`, {
    token: userTok,
  });
  claim.status === 200 || claim.status === 201
    ? claim.json?.code === secret
      ? pass('app_claim_admin_row')
      : fail('app_claim_admin_row', JSON.stringify(claim.json))
    : fail('app_claim_admin_row', `status=${claim.status}`);

  const badStock = await req('POST', '/api/v1/admin/redeem', {
    token: adminTok,
    body: {
      title: 'Bad stock',
      type: 'GOOGLE_PLAY',
      valueLabel: 'x',
      codeSecret: `BADE2E${stamp}STOCK99`,
      status: 'ACTIVE',
      cadence: 'DAILY',
      stockLeft: 5,
    },
  });
  badStock.status === 400
    ? pass('reject_stock_over_one')
    : fail('reject_stock_over_one', `status=${badStock.status}`);

  const demoPage = fs.readFileSync(
    path.join(__dirname, '..', '..', 'admin/src/app/(ops)/redeem/page.tsx'),
    'utf8',
  );
  !demoPage.includes('REDEEM_DEMO_ROWS')
    ? pass('admin_page_has_no_demo_rows')
    : fail('admin_page_has_no_demo_rows');

  if (id) {
    await req('DELETE', `/api/v1/admin/redeem/${id}`, { token: adminTok });
    const gone = await prisma.redeemCode.findUnique({ where: { id } });
    !gone ? pass('admin_delete') : fail('admin_delete');
  }

  await prisma.redeemClaim.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });

  const dummySecrets = [
    'ABCD-8X92-K12M-99PL',
    'ABCD-8X92-K12M-99P2',
    'FFDX-7K21-P90Q-44MZ',
    'USED-0000-0000-0001',
    'WEEK-9K21-M88P-12QT',
    'LOWX-7K21-P90Q-0001',
    'HOLD-9K21-M88P-55ZX',
  ];
  const purged = await prisma.redeemCode.deleteMany({
    where: { codeSecret: { in: dummySecrets } },
  });
  pass('purged_known_dummy_secrets', String(purged.count));

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
