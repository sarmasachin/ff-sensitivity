/**
 * Live shop admin CRUD + economy catalog/purchase against Postgres.
 */
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';

const API = process.env.API_BASE ?? 'http://127.0.0.1:4000';
const prisma = new PrismaClient();
const ROOT = path.join(__dirname, '..', '..');

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

function readRepo(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
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

  const page = readRepo('admin/src/app/(ops)/shop/page.tsx');
  const data = readRepo('admin/src/components/shop/shop-data.ts');
  !page.includes('SHOP_DEMO_ROWS') &&
  !data.includes('SHOP_DEMO_ROWS') &&
  page.includes('fetchShopBundle')
    ? pass('admin_shop_no_demo_uses_api')
    : fail('admin_shop_no_demo_uses_api');

  const unauth = await req('GET', '/api/v1/admin/shop');
  unauth.status === 401
    ? pass('admin_shop_requires_auth', String(unauth.status))
    : fail('admin_shop_requires_auth', JSON.stringify(unauth.json));

  const admin = await prisma.admin.findFirst({
    where: {
      email: process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com',
      isActive: true,
    },
  });
  if (!admin || !process.env.JWT_ACCESS_SECRET) {
    fail('admin_jwt');
    process.exit(1);
  }
  const adminTok = jwt.sign(
    { sub: admin.id, email: admin.email, role: admin.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' },
  );

  const stamp = Date.now().toString();
  const id = `e2e_shop_${stamp}`;
  const created = await req('POST', '/api/v1/admin/shop', {
    token: adminTok,
    body: {
      id,
      title: 'E2E Live Shop Item',
      subtitle: 'Created by e2e-shop-admin',
      category: 'BOOST',
      priceCoins: 77,
      enabled: true,
      oneTime: false,
      stockLimit: 5,
      rewardTag: 'E2E',
      sortOrder: 999,
    },
  });
  (created.status === 200 || created.status === 201) && created.json?.id === id
    ? pass('admin_create_shop_item', id)
    : fail('admin_create_shop_item', JSON.stringify(created.json));

  const listed = await req('GET', '/api/v1/admin/shop', { token: adminTok });
  const row = (listed.json?.items ?? []).find((r: any) => r.id === id);
  listed.status === 200 && row && row.priceCoins === 77
    ? pass('admin_list_contains_created')
    : fail('admin_list_contains_created', JSON.stringify(row));

  const patched = await req('PATCH', `/api/v1/admin/shop/${id}`, {
    token: adminTok,
    body: { title: 'E2E Live Shop Item Updated', priceCoins: 88 },
  });
  patched.status === 200 && patched.json?.priceCoins === 88
    ? pass('admin_update_shop_item')
    : fail('admin_update_shop_item', JSON.stringify(patched.json));

  const catalog = await req('GET', '/api/v1/economy/shop/catalog', {
    token: adminTok,
  });
  // catalog needs user JWT — admin JWT should 401
  catalog.status === 401
    ? pass('app_catalog_rejects_admin_jwt')
    : fail('app_catalog_rejects_admin_jwt', String(catalog.status));

  const user = await prisma.user.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!user || !process.env.JWT_USER_SECRET) {
    fail('user_jwt_setup');
  } else {
    const userTok = jwt.sign(
      { sub: user.id, email: user.email, aud: 'user', tv: 0 },
      process.env.JWT_USER_SECRET,
      { expiresIn: '1h' },
    );
    const appCat = await req('GET', '/api/v1/economy/shop/catalog', {
      token: userTok,
    });
    const hit = (appCat.json?.items ?? []).find((r: any) => r.id === id);
    appCat.status === 200 && hit && hit.priceCoins === 88
      ? pass('app_catalog_sees_admin_item')
      : fail('app_catalog_sees_admin_item', JSON.stringify(hit ?? appCat.json));
  }

  const dup = await req('POST', '/api/v1/admin/shop', {
    token: adminTok,
    body: {
      id,
      title: 'Dup',
      subtitle: 'Dup',
      category: 'PACK',
      priceCoins: 10,
      enabled: true,
      oneTime: true,
      rewardTag: 'DUP',
    },
  });
  dup.status === 409
    ? pass('duplicate_id_conflict')
    : fail('duplicate_id_conflict', JSON.stringify(dup.json));

  const deleted = await req('DELETE', `/api/v1/admin/shop/${id}`, {
    token: adminTok,
  });
  deleted.status === 200 || deleted.status === 201
    ? pass('admin_delete_shop_item')
    : fail('admin_delete_shop_item', JSON.stringify(deleted.json));

  const leftover = await prisma.shopItem.count({ where: { id } });
  leftover === 0
    ? pass('no_leftover_e2e_shop_row')
    : fail('no_leftover_e2e_shop_row');

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
